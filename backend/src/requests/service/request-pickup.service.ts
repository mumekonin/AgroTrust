import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Model } from 'mongoose';
import { AuditService } from '../../audit/service/audit.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { FarmersService } from '../../farmers/service/farmers.service.js';
import {
  NotificationEvent,
  type NotificationLanguage,
} from '../../notifications/schema/notification.schema.js';
import { NotificationsService } from '../../notifications/service/notifications.service.js';
import { hashPickupCode } from '../../shipments/service/coverage.js';
import { UsersService } from '../../users/service/users.service.js';
import { InputRequest, RequestStatus, type InputRequestDocument } from '../schema/input-request.schema.js';
import type { ChunkActor } from './request-requisition.service.js';

const BATCH = 300;
const REMINDER_MS = 7 * 86_400_000;
const MAX_ATTEMPTS = 5;
const UNCOLLECTED = 'UNCOLLECTED';

export interface PickupItem {
  inputId: string;
  qtyKg: number;
}

export interface PickupRequest {
  id: string;
  requestNo: string;
  farmerId: string;
  seasonId: string;
  localCenterId: string;
  status: string;
  waitlisted: boolean;
  pickupAttempts: number;
  pickupCodeHash?: string;
  pickupExpiresAt?: Date;
  items: PickupItem[];
}

@Injectable()
export class RequestPickupService {
  constructor(
    @InjectModel(InputRequest.name) private readonly requests: Model<InputRequest>,
    private readonly farmers: FarmersService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async findByNo(requestNo: string): Promise<PickupRequest | null> {
    const doc = await this.requests.findOne({ requestNo: requestNo.trim() }).exec();
    return doc ? toPickup(doc) : null;
  }

  async findById(id: string): Promise<PickupRequest | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.requests.findById(id).exec();
    return doc ? toPickup(doc) : null;
  }

  async recordFailure(id: string): Promise<boolean> {
    const result = await this.requests
      .updateOne(
        {
          _id: objectId(id, 'Invalid request'),
          status: RequestStatus.READY_FOR_PICKUP,
          pickupAttempts: { $lt: MAX_ATTEMPTS },
        },
        { $inc: { pickupAttempts: 1 } },
      )
      .exec();
    return result.matchedCount === 1;
  }

  async markCompleted(id: string, actor: ChunkActor, session: ClientSession): Promise<PickupRequest | null> {
    const now = new Date();
    const updated = await this.requests
      .findOneAndUpdate(
        { _id: objectId(id, 'Invalid request'), status: RequestStatus.READY_FOR_PICKUP },
        {
          $set: { status: RequestStatus.COMPLETED },
          $push: {
            statusHistory: { status: RequestStatus.COMPLETED, at: now, actorId: objectIdOrUndefined(actor.userId) },
          },
        },
        { new: true, session },
      )
      .exec();
    if (!updated) return null;
    const view = toPickup(updated);
    const quantityKg = view.items.reduce((sum, item) => sum + item.qtyKg, 0);
    await this.notify(updated, session, {
      event: NotificationEvent.PICKUP_COMPLETED,
      params: { quantityKg: String(quantityKg) },
    });
    await this.audit.append({
      actor: { userId: actor.userId, role: actor.role, ip: actor.ip, userAgent: actor.userAgent },
      action: 'PICKUP_COMPLETED',
      entity: { type: 'input_request', id: view.id },
      changes: { requestNo: view.requestNo, quantityKg },
      requestId: actor.requestId,
      localCenterId: view.localCenterId,
      session,
    });
    return view;
  }

  async markExpired(id: string, now: Date, actor: ChunkActor, session: ClientSession): Promise<PickupRequest | null> {
    const updated = await this.requests
      .findOneAndUpdate(
        {
          _id: objectId(id, 'Invalid request'),
          status: RequestStatus.READY_FOR_PICKUP,
          pickupExpiresAt: { $lte: now },
        },
        {
          $set: { status: RequestStatus.EXPIRED, rejectionReason: UNCOLLECTED, waitlisted: false },
          $push: {
            statusHistory: {
              status: RequestStatus.EXPIRED,
              at: now,
              reason: UNCOLLECTED,
              actorId: objectIdOrUndefined(actor.userId),
            },
          },
        },
        { new: true, session },
      )
      .exec();
    if (!updated) return null;
    await this.notify(updated, session, {
      event: NotificationEvent.REQUEST_EXPIRED,
      params: { requestNo: updated.requestNo },
    });
    await this.audit.append({
      actor: { userId: actor.userId, role: actor.role, ip: actor.ip, userAgent: actor.userAgent },
      action: 'REQUEST_EXPIRED',
      entity: { type: 'input_request', id: String(updated._id) },
      changes: { requestNo: updated.requestNo, reason: UNCOLLECTED },
      requestId: actor.requestId,
      localCenterId: String(updated.localCenterId),
      session,
    });
    return toPickup(updated);
  }

  async markFromWaitlist(
    id: string,
    code: string,
    pepper: string,
    expiresAt: Date,
    message: { centerName: string; deadline: string },
    actor: ChunkActor,
    session: ClientSession,
  ): Promise<boolean> {
    const now = new Date();
    const updated = await this.requests
      .findOneAndUpdate(
        { _id: objectId(id, 'Invalid request'), status: RequestStatus.REQUISITIONED, waitlisted: true },
        {
          $set: {
            status: RequestStatus.READY_FOR_PICKUP,
            waitlisted: false,
            pickupCodeHash: hashPickupCode(code, pepper),
            pickupExpiresAt: expiresAt,
            pickupAttempts: 0,
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
    return true;
  }

  async dueForReminder(now: Date): Promise<PickupRequest[]> {
    const docs = await this.requests
      .find({
        status: RequestStatus.READY_FOR_PICKUP,
        pickupExpiresAt: { $gt: now, $lte: new Date(now.getTime() + REMINDER_MS) },
      })
      .sort({ pickupExpiresAt: 1, _id: 1 })
      .limit(BATCH)
      .exec();
    return docs.map(toPickup);
  }

  async dueForExpiry(now: Date): Promise<PickupRequest[]> {
    const docs = await this.requests
      .find({ status: RequestStatus.READY_FOR_PICKUP, pickupExpiresAt: { $lte: now } })
      .sort({ pickupExpiresAt: 1, _id: 1 })
      .limit(BATCH)
      .exec();
    return docs.map(toPickup);
  }

  async waitlist(centerId: string, seasonId: string): Promise<PickupRequest[]> {
    const docs = await this.requests
      .find({
        localCenterId: objectId(centerId, 'Invalid center'),
        seasonId: objectId(seasonId, 'Invalid season'),
        status: RequestStatus.REQUISITIONED,
        waitlisted: true,
      })
      .sort({ reviewedAt: 1, _id: 1 })
      .limit(BATCH)
      .exec();
    return docs.map(toPickup);
  }

  async remind(request: PickupRequest): Promise<void> {
    const doc = await this.requests.findById(request.id).exec();
    if (!doc) return;
    await this.notify(doc, undefined, {
      event: NotificationEvent.PICKUP_REMINDER,
      params: { deadline: (request.pickupExpiresAt ?? new Date()).toISOString().slice(0, 10) },
    });
  }

  private async notify(
    doc: InputRequestDocument,
    session: ClientSession | undefined,
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

function toPickup(doc: InputRequestDocument): PickupRequest {
  return {
    id: String(doc._id),
    requestNo: doc.requestNo,
    farmerId: String(doc.farmerId),
    seasonId: String(doc.seasonId),
    localCenterId: String(doc.localCenterId),
    status: doc.status,
    waitlisted: doc.waitlisted,
    pickupAttempts: doc.pickupAttempts ?? 0,
    pickupCodeHash: doc.pickupCodeHash,
    pickupExpiresAt: doc.pickupExpiresAt,
    items: handoverItems(doc),
  };
}

function handoverItems(doc: InputRequestDocument): PickupItem[] {
  const accepted = doc.items.filter((item) => (item.acceptedQtyKg ?? 0) > 0);
  const source = accepted.length > 0 ? accepted : doc.items;
  return source
    .map((item) => ({
      inputId: String(item.inputId),
      qtyKg: (item.acceptedQtyKg ?? 0) > 0 ? (item.acceptedQtyKg ?? 0) : item.qtyKg,
    }))
    .filter((item) => item.qtyKg > 0);
}

function objectId(id: string, message: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, message);
  return new Types.ObjectId(id);
}

function objectIdOrUndefined(id: string): Types.ObjectId | undefined {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined;
}
