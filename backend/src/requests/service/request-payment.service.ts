import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { AllocationsService } from '../../allocations/service/allocations.service.js';
import { AuditService } from '../../audit/service/audit.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { FarmersService } from '../../farmers/service/farmers.service.js';
import {
  NotificationEvent,
  type NotificationLanguage,
} from '../../notifications/schema/notification.schema.js';
import { NotificationsService } from '../../notifications/service/notifications.service.js';
import { formatBirr, payableSantim } from '../../requisitions/service/supply.js';
import { UsersService } from '../../users/service/users.service.js';
import { InputRequest, RequestStatus, type InputRequestDocument } from '../schema/input-request.schema.js';
import type { ChunkActor } from './request-requisition.service.js';

const PAYMENT_BATCH = 300;
const REMINDER_WINDOW_MS = 2 * 86_400_000;
const UNPAID_REASON = 'UNPAID';

export interface PaymentItem {
  inputId: string;
  qtyKg: number;
  acceptedQtyKg?: number;
  unitPriceSantimPerKg: number;
  subsidySantimPerKg: number;
}

export interface PaymentRequest {
  id: string;
  requestNo: string;
  farmerId: string;
  seasonId: string;
  localCenterId: string;
  requisitionId?: string;
  status: string;
  paymentDueAt?: Date;
  payableSantim: number;
  items: PaymentItem[];
}

@Injectable()
export class RequestPaymentService {
  constructor(
    @InjectModel(InputRequest.name) private readonly requests: Model<InputRequest>,
    @InjectConnection() private readonly connection: Connection,
    private readonly allocations: AllocationsService,
    private readonly farmers: FarmersService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async read(id: string): Promise<PaymentRequest> {
    if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
    const doc = await this.requests.findById(id).exec();
    if (!doc) throw new AppException(ErrorCode.NOT_FOUND, 'Request not found', 404);
    return toPaymentRequest(doc);
  }

  async markPaid(
    id: string,
    payableSantim: number,
    paidAt: Date,
    actorId: string,
    session: ClientSession,
  ): Promise<PaymentRequest | null> {
    const updated = await this.requests
      .findOneAndUpdate(
        {
          _id: objectId(id, 'Invalid request'),
          status: RequestStatus.ACCEPTED,
          paymentDueAt: { $gt: paidAt },
        },
        {
          $set: { status: RequestStatus.PAID, paidAt, payableSantim },
          $push: {
            statusHistory: {
              status: RequestStatus.PAID,
              at: paidAt,
              actorId: objectIdOrUndefined(actorId),
            },
          },
        },
        { new: true, session },
      )
      .exec();
    return updated ? toPaymentRequest(updated) : null;
  }

  async idsForRequisitions(requisitionIds: string[]): Promise<string[]> {
    if (requisitionIds.length === 0) return [];
    const docs = await this.requests
      .find({
        requisitionId: { $in: requisitionIds.map((id) => objectId(id, 'Invalid requisition')) },
        status: RequestStatus.PAID,
      })
      .select({ _id: 1 })
      .lean()
      .exec();
    return docs.map((doc) => String(doc._id));
  }

  async idsInCenters(centerIds: string[]): Promise<string[]> {
    if (centerIds.length === 0) return [];
    const docs = await this.requests
      .find({
        localCenterId: { $in: centerIds.map((id) => objectId(id, 'Invalid center')) },
        status: RequestStatus.PAID,
      })
      .select({ _id: 1 })
      .lean()
      .exec();
    return docs.map((doc) => String(doc._id));
  }

  async remindDue(now: Date): Promise<number> {
    const soon = new Date(now.getTime() + REMINDER_WINDOW_MS);
    const docs = await this.requests
      .find({
        status: RequestStatus.ACCEPTED,
        paymentDueAt: { $gt: now, $lte: soon },
      })
      .sort({ paymentDueAt: 1, _id: 1 })
      .limit(PAYMENT_BATCH)
      .exec();
    if (docs.length === 0) return 0;
    const farmers = await this.farmers.lookupMany(docs.map((doc) => String(doc.farmerId)));
    let sent = 0;
    for (const doc of docs) {
      const amount = payableSantim(priced(doc));
      await this.notify(doc, farmers, undefined, {
        event: NotificationEvent.PAYMENT_REMINDER,
        params: {
          amount: formatBirr(amount),
          deadline: (doc.paymentDueAt ?? now).toISOString().slice(0, 10),
        },
      });
      sent += 1;
    }
    return sent;
  }

  async expireUnpaid(now: Date, actor: ChunkActor): Promise<number> {
    const docs = await this.requests
      .find({ status: RequestStatus.ACCEPTED, paymentDueAt: { $lte: now } })
      .sort({ paymentDueAt: 1, _id: 1 })
      .limit(PAYMENT_BATCH)
      .exec();
    let expired = 0;
    for (const doc of docs) {
      const done = await this.expireOne(doc, now, actor);
      if (done) expired += 1;
    }
    return expired;
  }

  private async expireOne(doc: InputRequestDocument, now: Date, actor: ChunkActor): Promise<boolean> {
    const farmers = await this.farmers.lookupMany([String(doc.farmerId)]);
    let changed = false;
    await this.transaction(async (session) => {
      const updated = await this.requests
        .updateOne(
          { _id: doc._id, status: RequestStatus.ACCEPTED, paymentDueAt: { $lte: now } },
          {
            $set: { status: RequestStatus.EXPIRED, rejectionReason: UNPAID_REASON },
            $push: {
              statusHistory: {
                status: RequestStatus.EXPIRED,
                at: now,
                actorId: objectIdOrUndefined(actor.userId),
                reason: UNPAID_REASON,
              },
            },
          },
          { session },
        )
        .exec();
      if (updated.matchedCount !== 1) return;
      changed = true;
      for (const item of doc.items) {
        const qtyKg = item.acceptedQtyKg ?? item.qtyKg;
        if (qtyKg <= 0) continue;
        await this.allocations.release(
          {
            farmerId: String(doc.farmerId),
            seasonId: String(doc.seasonId),
            inputId: String(item.inputId),
            qtyKg,
          },
          session,
        );
      }
      await this.notify(doc, farmers, session, {
        event: NotificationEvent.REQUEST_EXPIRED_UNPAID,
        params: { requestNo: doc.requestNo },
      });
      await this.audit.append({
        actor: { userId: actor.userId, role: actor.role, ip: actor.ip, userAgent: actor.userAgent },
        action: 'REQUEST_EXPIRED_UNPAID',
        entity: { type: 'input_request', id: String(doc._id) },
        changes: { requestNo: doc.requestNo, reason: UNPAID_REASON },
        requestId: actor.requestId,
        localCenterId: String(doc.localCenterId),
        session,
      });
    });
    return changed;
  }

  private async notify(
    doc: InputRequestDocument,
    farmers: Awaited<ReturnType<FarmersService['lookupMany']>>,
    session: ClientSession | undefined,
    message: { event: NotificationEvent; params: Record<string, string> },
  ): Promise<void> {
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

  private async transaction(fn: (session: ClientSession) => Promise<void>): Promise<void> {
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(() => fn(session));
    } finally {
      await session.endSession();
    }
  }
}

function priced(doc: InputRequestDocument): { acceptedQtyKg: number; unitPriceSantimPerKg: number; subsidySantimPerKg: number }[] {
  return doc.items.map((item) => ({
    acceptedQtyKg: item.acceptedQtyKg ?? 0,
    unitPriceSantimPerKg: item.unitPriceSantimPerKg,
    subsidySantimPerKg: item.subsidySantimPerKg,
  }));
}

function toPaymentRequest(doc: InputRequestDocument): PaymentRequest {
  return {
    id: String(doc._id),
    requestNo: doc.requestNo,
    farmerId: String(doc.farmerId),
    seasonId: String(doc.seasonId),
    localCenterId: String(doc.localCenterId),
    requisitionId: doc.requisitionId ? String(doc.requisitionId) : undefined,
    status: doc.status,
    paymentDueAt: doc.paymentDueAt,
    payableSantim: doc.payableSantim,
    items: doc.items.map((item) => ({
      inputId: String(item.inputId),
      qtyKg: item.qtyKg,
      acceptedQtyKg: item.acceptedQtyKg,
      unitPriceSantimPerKg: item.unitPriceSantimPerKg,
      subsidySantimPerKg: item.subsidySantimPerKg,
    })),
  };
}

function objectId(id: string, message: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, message);
  return new Types.ObjectId(id);
}

function objectIdOrUndefined(id: string): Types.ObjectId | undefined {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined;
}
