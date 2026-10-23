import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Model } from 'mongoose';
import { AuditService } from '../../audit/service/audit.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Env } from '../../config/env.schema.js';
import { FarmersService } from '../../farmers/service/farmers.service.js';
import {
  NotificationEvent,
  type NotificationLanguage,
} from '../../notifications/schema/notification.schema.js';
import { NotificationsService } from '../../notifications/service/notifications.service.js';
import { hashPickupCode } from '../../shipments/service/coverage.js';
import { compareSmallestLand, REQUISITION_CHUNK } from '../../requisitions/service/supply.js';
import { PriorityPolicy } from '../../seasons/schema/season.schema.js';
import { UsersService } from '../../users/service/users.service.js';
import { InputRequest, RequestStatus } from '../schema/input-request.schema.js';
import type { ChunkActor } from './request-requisition.service.js';

export interface PaidRequest {
  id: string;
  items: { inputId: string; qtyKg: number }[];
}

@Injectable()
export class RequestShipmentService {
  private readonly pepper: string;

  constructor(
    @InjectModel(InputRequest.name) private readonly requests: Model<InputRequest>,
    private readonly farmers: FarmersService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    config: ConfigService<Env, true>,
  ) {
    this.pepper = config.get('AUTH_PEPPER', { infer: true });
  }

  async nextPaid(requisitionId: string, policy: PriorityPolicy, exclude: string[]): Promise<PaidRequest[]> {
    const filter: Record<string, unknown> = {
      requisitionId: objectId(requisitionId, 'Invalid requisition'),
      status: RequestStatus.PAID,
    };
    const excluded = exclude.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (excluded.length > 0) filter._id = { $nin: excluded };
    if (policy !== PriorityPolicy.SMALLEST_LAND_FIRST) {
      const docs = await this.requests.find(filter).sort({ reviewedAt: 1, _id: 1 }).limit(REQUISITION_CHUNK).exec();
      return docs.map(toPaid);
    }
    const heads = await this.requests.find(filter).select({ farmerId: 1, reviewedAt: 1 }).lean().exec();
    const farmers = await this.farmers.lookupMany(heads.map((head) => String(head.farmerId)));
    heads.sort((left, right) =>
      compareSmallestLand(
        {
          id: String(left._id),
          reviewedAt: left.reviewedAt,
          landHoldingHa: farmers.get(String(left.farmerId))?.landHoldingHa ?? Number.POSITIVE_INFINITY,
        },
        {
          id: String(right._id),
          reviewedAt: right.reviewedAt,
          landHoldingHa: farmers.get(String(right.farmerId))?.landHoldingHa ?? Number.POSITIVE_INFINITY,
        },
      ),
    );
    const ids = heads.slice(0, REQUISITION_CHUNK).map((head) => head._id);
    if (ids.length === 0) return [];
    const docs = await this.requests.find({ _id: { $in: ids } }).exec();
    const order = new Map(ids.map((id, index) => [String(id), index]));
    docs.sort((left, right) => (order.get(String(left._id)) ?? 0) - (order.get(String(right._id)) ?? 0));
    return docs.map(toPaid);
  }

  async markInTransit(
    requestId: string,
    message: { centerName: string; eta: string },
    actor: ChunkActor,
    session: ClientSession,
  ): Promise<boolean> {
    const now = new Date();
    const updated = await this.requests
      .findOneAndUpdate(
        { _id: objectId(requestId, 'Invalid request'), status: RequestStatus.PAID },
        {
          $set: { status: RequestStatus.IN_TRANSIT },
          $push: {
            statusHistory: { status: RequestStatus.IN_TRANSIT, at: now, actorId: objectIdOrUndefined(actor.userId) },
          },
        },
        { new: true, session },
      )
      .exec();
    if (!updated) return false;
    await this.notify(updated, session, {
      event: NotificationEvent.SHIPMENT_DISPATCHED,
      params: { center: message.centerName, eta: message.eta },
    });
    await this.audit.append({
      actor: { userId: actor.userId, role: actor.role, ip: actor.ip, userAgent: actor.userAgent },
      action: 'REQUEST_IN_TRANSIT',
      entity: { type: 'input_request', id: String(updated._id) },
      changes: { requestNo: updated.requestNo },
      requestId: actor.requestId,
      localCenterId: String(updated.localCenterId),
      session,
    });
    return true;
  }

  /** Stores only the HMAC. The plaintext code goes to the SMS and is not audited. */
  async markReady(
    requestId: string,
    code: string,
    expiresAt: Date,
    message: { centerName: string; deadline: string },
    actor: ChunkActor,
    session: ClientSession,
  ): Promise<boolean> {
    const now = new Date();
    const updated = await this.requests
      .findOneAndUpdate(
        { _id: objectId(requestId, 'Invalid request'), status: RequestStatus.IN_TRANSIT },
        {
          $set: {
            status: RequestStatus.READY_FOR_PICKUP,
            pickupCodeHash: hashPickupCode(code, this.pepper),
            pickupExpiresAt: expiresAt,
          },
          $push: {
            statusHistory: {
              status: RequestStatus.READY_FOR_PICKUP,
              at: now,
              actorId: objectIdOrUndefined(actor.userId),
            },
          },
        },
        { new: true, session },
      )
      .exec();
    if (!updated) return false;
    await this.notify(updated, session, {
      event: NotificationEvent.GOODS_ARRIVED,
      params: { center: message.centerName, deadline: message.deadline, code },
    });
    await this.audit.append({
      actor: { userId: actor.userId, role: actor.role, ip: actor.ip, userAgent: actor.userAgent },
      action: 'REQUEST_READY_FOR_PICKUP',
      entity: { type: 'input_request', id: String(updated._id) },
      changes: { requestNo: updated.requestNo, pickupExpiresAt: expiresAt.toISOString() },
      requestId: actor.requestId,
      localCenterId: String(updated.localCenterId),
      session,
    });
    return true;
  }

  async statuses(ids: string[]): Promise<Map<string, string>> {
    const valid = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (valid.length === 0) return new Map();
    const docs = await this.requests.find({ _id: { $in: valid } }).select({ status: 1 }).lean().exec();
    return new Map(docs.map((doc) => [String(doc._id), doc.status]));
  }

  private async notify(
    doc: { _id: Types.ObjectId; farmerId: Types.ObjectId },
    session: ClientSession,
    message: { event: NotificationEvent; params: Record<string, string> },
  ): Promise<void> {
    const farmers = await this.farmers.lookupMany([String(doc.farmerId)]);
    const farmer = farmers.get(String(doc.farmerId));
    const language = await this.languageFor(farmer?.userId);
    await this.notifications.enqueue({
      farmerId: String(doc.farmerId),
      userId: farmer?.userId,
      phone: farmer?.smsEnabled ? farmer.phone : undefined,
      event: message.event,
      language,
      params: message.params,
      related: { type: 'input_request', id: String(doc._id) },
      session,
    });
  }

  private async languageFor(userId?: string): Promise<NotificationLanguage> {
    if (!userId) return 'en';
    const user = await this.users.findById(userId);
    if (user?.preferredLanguage === 'am' || user?.preferredLanguage === 'om') return user.preferredLanguage;
    return 'en';
  }
}

function toPaid(doc: {
  _id: Types.ObjectId;
  items: { inputId: Types.ObjectId; acceptedQtyKg?: number }[];
}): PaidRequest {
  return {
    id: String(doc._id),
    items: doc.items
      .filter((item) => (item.acceptedQtyKg ?? 0) > 0)
      .map((item) => ({ inputId: String(item.inputId), qtyKg: item.acceptedQtyKg ?? 0 })),
  };
}

function objectId(id: string, message: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, message);
  return new Types.ObjectId(id);
}

function objectIdOrUndefined(id: string): Types.ObjectId | undefined {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined;
}
