import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import type { Env } from '../../config/env.schema.js';
import { FraudService } from '../../fraud/service/fraud.service.js';
import { LocalCentersService } from '../../local-centers/service/local-centers.service.js';
import type { ListAuditQuery } from '../dto/audit.dto.js';
import { AuditCounter, AuditDigest, AuditLog } from '../schema/audit-log.schema.js';
import { AUDIT_GENESIS, type ChainLink, auditHash, linkRecord, signDigest, walkChain } from './audit-hash.js';

const COUNTER_KEY = 'audit';
const DEFAULT_LIMIT = 50;

export interface AuditAppendInput {
  actor: { userId: string; role: string; ip: string; userAgent?: string };
  action: string;
  entity: { type: string; id: string };
  changes?: Record<string, unknown>;
  requestId?: string;
  localCenterId?: string;
  session?: ClientSession;
}

@Injectable()
export class AuditService {
  private readonly pepper: string;

  constructor(
    @InjectModel(AuditLog.name) private readonly logs: Model<AuditLog>,
    @InjectModel(AuditCounter.name) private readonly counters: Model<AuditCounter>,
    @InjectModel(AuditDigest.name) private readonly digests: Model<AuditDigest>,
    @InjectConnection() private readonly connection: Connection,
    private readonly fraud: FraudService,
    private readonly centers: LocalCentersService,
    config: ConfigService<Env, true>,
  ) {
    this.pepper = config.get('AUTH_PEPPER', { infer: true });
  }

  /** Writes the next hash-chained row. Pass the caller's session when it must commit together. */
  async append(input: AuditAppendInput): Promise<void> {
    if (input.session) {
      await this.write(input, input.session);
      return;
    }
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(() => this.write(input, session));
    } finally {
      await session.endSession();
    }
  }

  async list(principal: Principal, query: ListAuditQuery) {
    const filter = await this.scope(principal);
    const limit = query.limit ?? DEFAULT_LIMIT;
    if (query.action) filter.action = query.action.trim();
    if (query.entityType) filter['entity.type'] = query.entityType.trim();
    if (query.entityId) filter['entity.id'] = query.entityId.trim();
    if (query.cursor !== undefined) filter.seq = { $lt: query.cursor };
    const docs = await this.logs.find(filter).sort({ seq: -1 }).limit(limit + 1).lean().exec();
    const page = docs.slice(0, limit);
    const next = docs.length > limit ? page[page.length - 1] : undefined;
    return {
      items: page.map((doc) => ({
        seq: doc.seq,
        at: doc.at,
        actor: doc.actor,
        action: doc.action,
        entity: doc.entity,
        changes: doc.changes ?? {},
        requestId: doc.requestId,
        localCenterId: doc.localCenterId,
        prevHash: doc.prevHash,
        hash: doc.hash,
      })),
      nextCursor: next?.seq,
    };
  }

  /** Recomputes every hash. A break opens one flag and the digest records the last intact row. */
  async verifyAndPublish(now = new Date()): Promise<void> {
    const docs = await this.logs.find().sort({ seq: 1 }).lean().exec();
    const walked = walkChain(docs.map(toLink));
    if (walked.brokenSeq !== undefined) {
      const details = { seq: walked.brokenSeq };
      if (!(await this.fraud.hasOpen('audit_chain_break', details))) {
        await this.transaction((session) =>
          this.fraud.open({ type: 'audit_chain_break', severity: 'high', details }, session),
        );
      }
    }
    const date = now.toISOString().slice(0, 10);
    await this.digests
      .updateOne(
        { date },
        {
          $set: {
            seq: walked.seq,
            hash: walked.hash,
            signature: signDigest(this.pepper, date, walked.seq, walked.hash),
            intact: walked.intact,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  private async write(input: AuditAppendInput, session: ClientSession): Promise<void> {
    const counter = await this.counters
      .findOneAndUpdate({ key: COUNTER_KEY }, { $inc: { seq: 1 } }, { upsert: true, new: true, session })
      .exec();
    if (!counter) {
      throw new AppException(ErrorCode.INTERNAL_ERROR, 'Could not number the audit entry', 500);
    }
    const seq = counter.seq;
    const previous =
      seq > 1
        ? await this.logs.findOne({ seq: seq - 1 }).session(session).select({ hash: 1 }).lean().exec()
        : null;
    const at = new Date();
    const actor = {
      userId: input.actor.userId,
      role: input.actor.role,
      ip: input.actor.ip,
      userAgent: input.actor.userAgent,
    };
    const prevHash = previous?.hash ?? AUDIT_GENESIS;
    const link = {
      seq,
      at: at.toISOString(),
      actor,
      action: input.action,
      entity: input.entity,
      changes: input.changes ?? {},
      requestId: input.requestId ?? '',
      localCenterId: input.localCenterId,
    };
    await this.logs.create(
      [
        {
          seq,
          at,
          actor,
          action: input.action,
          entity: input.entity,
          changes: input.changes ?? {},
          requestId: input.requestId || undefined,
          localCenterId: input.localCenterId,
          prevHash,
          hash: auditHash(prevHash, linkRecord(link)),
        },
      ],
      { session },
    );
  }

  private async scope(principal: Principal): Promise<Record<string, unknown>> {
    if (principal.roles.includes(Role.NATIONAL_ADMIN) || principal.roles.includes(Role.AUDITOR)) return {};
    if (!principal.roles.includes(Role.REGIONAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const centerIds = await this.centers.idsInScope(principal);
    return { localCenterId: { $in: centerIds } };
  }

  private async transaction(fn: (session: ClientSession) => Promise<void>): Promise<void> {
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(() => fn(session));
    } finally {
      await session.endSession();
    }
  }
}

function toLink(doc: {
  seq: number;
  at: Date;
  actor: { userId: string; role: string; ip: string; userAgent?: string };
  action: string;
  entity: { type: string; id: string };
  changes?: Record<string, unknown>;
  requestId?: string;
  localCenterId?: string;
  prevHash: string;
  hash: string;
}): ChainLink {
  return {
    seq: doc.seq,
    at: doc.at.toISOString(),
    actor: {
      userId: doc.actor.userId,
      role: doc.actor.role,
      ip: doc.actor.ip,
      userAgent: doc.actor.userAgent,
    },
    action: doc.action,
    entity: doc.entity,
    changes: doc.changes ?? {},
    requestId: doc.requestId ?? '',
    localCenterId: doc.localCenterId,
    prevHash: doc.prevHash,
    hash: doc.hash,
  };
}
