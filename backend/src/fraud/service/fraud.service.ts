import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Model } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { LocalCentersService } from '../../local-centers/service/local-centers.service.js';
import type { ListFlagQuery, ResolveFlagDto } from '../dto/fraud.dto.js';
import { FraudFlag, FraudFlagStatus } from '../schema/fraud-flag.schema.js';

const DEFAULT_LIMIT = 50;

@Injectable()
export class FraudService {
  constructor(
    @InjectModel(FraudFlag.name) private readonly flags: Model<FraudFlag>,
    private readonly centers: LocalCentersService,
  ) {}

  async open(
    input: {
      type: string;
      severity: string;
      localCenterId?: string;
      farmerId?: string;
      requestId?: string;
      distributorId?: string;
      shipmentId?: string;
      paymentId?: string;
      details: Record<string, unknown>;
    },
    session: ClientSession,
  ): Promise<void> {
    await this.flags.create(
      [
        {
          type: input.type,
          severity: input.severity,
          localCenterId: optionalId(input.localCenterId),
          farmerId: optionalId(input.farmerId),
          requestId: optionalId(input.requestId),
          distributorId: optionalId(input.distributorId),
          shipmentId: optionalId(input.shipmentId),
          paymentId: optionalId(input.paymentId),
          details: input.details,
          status: FraudFlagStatus.OPEN,
        },
      ],
      { session },
    );
  }

  async hasOpen(type: string, details: Record<string, unknown>): Promise<boolean> {
    const filter: Record<string, unknown> = { type, status: FraudFlagStatus.OPEN };
    for (const [key, value] of Object.entries(details)) filter[`details.${key}`] = value;
    const existing = await this.flags.exists(filter).exec();
    return existing !== null;
  }

  async list(principal: Principal, query: ListFlagQuery) {
    const filter = await this.scope(principal);
    const limit = query.limit ?? DEFAULT_LIMIT;
    if (query.status) filter.status = query.status;
    if (query.severity) filter.severity = query.severity.trim();
    if (query.cursor) filter._id = { $lt: objectId(query.cursor, 'Invalid cursor') };
    const docs = await this.flags.find(filter).sort({ _id: -1 }).limit(limit + 1).lean().exec();
    const page = docs.slice(0, limit);
    const next = docs.length > limit ? page[page.length - 1] : undefined;
    return { items: page.map(toFlag), nextCursor: next ? String(next._id) : undefined };
  }

  async resolve(principal: Principal, id: string, input: ResolveFlagDto) {
    if (!principal.roles.includes(Role.REGIONAL_ADMIN) && !principal.roles.includes(Role.NATIONAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const flag = await this.flags.findById(objectId(id, 'Invalid id')).exec();
    if (!flag) throw new AppException(ErrorCode.NOT_FOUND, 'Flag not found', 404);
    await this.assertFlag(principal, flag.localCenterId ? String(flag.localCenterId) : undefined);
    if (flag.status === FraudFlagStatus.RESOLVED || flag.status === input.status) return toFlag(flag);
    const set: Record<string, unknown> = { status: input.status };
    if (input.status === FraudFlagStatus.RESOLVED) set.resolvedBy = objectId(principal.userId, 'Invalid user');
    const updated = await this.flags
      .findOneAndUpdate({ _id: flag._id, status: flag.status }, { $set: set }, { new: true })
      .exec();
    if (!updated) throw new AppException(ErrorCode.CONFLICT, 'This flag was already reviewed', 409);
    return toFlag(updated);
  }

  private async scope(principal: Principal): Promise<Record<string, unknown>> {
    if (principal.roles.includes(Role.NATIONAL_ADMIN) || principal.roles.includes(Role.AUDITOR)) return {};
    if (!principal.roles.includes(Role.REGIONAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const centerIds = await this.centers.idsInScope(principal);
    return { localCenterId: { $in: centerIds.map((centerId) => objectId(centerId, 'Invalid center')) } };
  }

  private async assertFlag(principal: Principal, localCenterId?: string): Promise<void> {
    if (principal.roles.includes(Role.NATIONAL_ADMIN)) return;
    if (!localCenterId) throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    const centerIds = await this.centers.idsInScope(principal);
    if (!centerIds.includes(localCenterId)) throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
  }
}

function toFlag(doc: {
  _id: Types.ObjectId;
  type: string;
  severity: string;
  status: string;
  localCenterId?: Types.ObjectId;
  distributorId?: Types.ObjectId;
  shipmentId?: Types.ObjectId;
  details: Record<string, unknown>;
  createdAt?: Date;
}) {
  return {
    id: String(doc._id),
    type: doc.type,
    severity: doc.severity,
    status: doc.status,
    localCenterId: doc.localCenterId ? String(doc.localCenterId) : undefined,
    distributorId: doc.distributorId ? String(doc.distributorId) : undefined,
    shipmentId: doc.shipmentId ? String(doc.shipmentId) : undefined,
    details: doc.details,
    createdAt: doc.createdAt,
  };
}

function optionalId(id?: string): Types.ObjectId | undefined {
  if (!id) return undefined;
  return objectId(id, 'Invalid id');
}

function objectId(id: string, message: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, message);
  return new Types.ObjectId(id);
}
