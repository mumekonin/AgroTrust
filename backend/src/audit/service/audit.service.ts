import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { AuditCounter } from '../schema/audit-log.schema.js';
import { AuditLog } from '../schema/audit-log.schema.js';
import { AUDIT_GENESIS, auditHash } from './audit-hash.js';

const COUNTER_KEY = 'audit';

export interface AuditAppendInput {
  actor: { userId: string; role: string; ip: string; userAgent?: string };
  action: string;
  entity: { type: string; id: string };
  changes?: Record<string, unknown>;
  requestId?: string;
  session?: ClientSession;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private readonly logs: Model<AuditLog>,
    @InjectModel(AuditCounter.name) private readonly counters: Model<AuditCounter>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

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
    const record: Record<string, unknown> = {
      seq,
      at: at.toISOString(),
      actor,
      action: input.action,
      entity: input.entity,
      changes: input.changes ?? {},
      requestId: input.requestId ?? '',
    };
    const prevHash = previous?.hash ?? AUDIT_GENESIS;
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
          prevHash,
          hash: auditHash(prevHash, record),
        },
      ],
      { session },
    );
  }
}
