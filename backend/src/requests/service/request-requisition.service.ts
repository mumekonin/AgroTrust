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
import {
  allocateSupply,
  compareApprovalTime,
  compareSmallestLand,
  formatBirr,
  payableSantim,
  paymentReference,
  REQUISITION_CHUNK,
} from '../../requisitions/service/supply.js';
import { PriorityPolicy } from '../../seasons/schema/season.schema.js';
import { UsersService } from '../../users/service/users.service.js';
import { InputRequest, RequestStatus, type InputRequestDocument } from '../schema/input-request.schema.js';

const WAITLIST_REASON = 'No supply before the cutoff';

export interface BundleLine {
  inputId: string;
  requestedKg: number;
}

export interface Bundle {
  requestCount: number;
  lines: BundleLine[];
}

export interface LinkedRequest {
  id: string;
  farmerId: string;
  requestNo: string;
  status: string;
  waitlisted: boolean;
  paidAt?: Date;
  items: { inputId: string; qtyKg: number; acceptedQtyKg?: number }[];
}

export interface ChunkActor {
  userId: string;
  role: string;
  ip: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class RequestRequisitionService {
  constructor(
    @InjectModel(InputRequest.name) private readonly requests: Model<InputRequest>,
    @InjectConnection() private readonly connection: Connection,
    private readonly allocations: AllocationsService,
    private readonly farmers: FarmersService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async bundle(centerId: string, seasonId: string, inputIds: string[]): Promise<Bundle> {
    if (inputIds.length === 0) return { requestCount: 0, lines: [] };
    const docs = await this.requests.find(this.approvedFilter(centerId, seasonId, inputIds)).lean().exec();
    const totals = new Map<string, number>();
    for (const doc of docs) {
      for (const item of doc.items) {
        const inputId = String(item.inputId);
        totals.set(inputId, (totals.get(inputId) ?? 0) + item.qtyKg);
      }
    }
    return {
      requestCount: docs.length,
      lines: [...totals.entries()].map(([inputId, requestedKg]) => ({ inputId, requestedKg })),
    };
  }

  async markChunk(
    requisitionId: string,
    centerId: string,
    seasonId: string,
    inputIds: string[],
    actor: ChunkActor,
  ): Promise<{ processed: number; finished: boolean }> {
    const docs = await this.requests
      .find(this.approvedFilter(centerId, seasonId, inputIds))
      .sort({ _id: 1 })
      .limit(REQUISITION_CHUNK)
      .exec();
    if (docs.length === 0) return { processed: 0, finished: true };
    await this.transaction(async (session) => {
      const now = new Date();
      for (const doc of docs) {
        const updated = await this.requests
          .updateOne(
            { _id: doc._id, status: RequestStatus.APPROVED },
            {
              $set: {
                status: RequestStatus.REQUISITIONED,
                requisitionId: objectId(requisitionId, 'Invalid requisition'),
                waitlisted: false,
              },
              $push: {
                statusHistory: {
                  status: RequestStatus.REQUISITIONED,
                  at: now,
                  actorId: objectIdOrUndefined(actor.userId),
                },
              },
            },
            { session },
          )
          .exec();
        if (updated.matchedCount !== 1) continue;
        await this.audit.append({
          actor: this.auditActor(actor),
          action: 'REQUEST_REQUISITIONED',
          entity: { type: 'input_request', id: String(doc._id) },
          changes: { requestNo: doc.requestNo, requisitionId },
          requestId: actor.requestId,
          localCenterId: String(doc.localCenterId),
          session,
        });
      }
    });
    return { processed: docs.length, finished: docs.length < REQUISITION_CHUNK };
  }

  async linkedTotals(requisitionId: string): Promise<Bundle> {
    const requisition = objectId(requisitionId, 'Invalid requisition');
    const [count, rows] = await Promise.all([
      this.requests.countDocuments({ requisitionId: requisition, status: RequestStatus.REQUISITIONED }),
      this.requests.aggregate<{ _id: Types.ObjectId; qty: number }>([
        { $match: { requisitionId: requisition, status: RequestStatus.REQUISITIONED } },
        { $unwind: '$items' },
        { $group: { _id: '$items.inputId', qty: { $sum: '$items.qtyKg' } } },
      ]),
    ]);
    return {
      requestCount: count,
      lines: rows.map((row) => ({ inputId: String(row._id), requestedKg: row.qty })),
    };
  }

  async acceptChunk(
    requisitionId: string,
    lines: { inputId: string; acceptedKg: number }[],
    policy: PriorityPolicy,
    paymentDueAt: Date,
    reason: string | undefined,
    actor: ChunkActor,
  ): Promise<{ processed: number; finished: boolean }> {
    const page = await this.nextAcceptPage(requisitionId, policy);
    if (page.length === 0) return { processed: 0, finished: true };
    const allocated = await this.allocatedKg(requisitionId);
    const remaining = new Map(lines.map((line) => [line.inputId, line.acceptedKg - (allocated.get(line.inputId) ?? 0)]));
    const decisions = new Map(
      allocateSupply(
        page.map((doc) => ({
          id: String(doc._id),
          items: doc.items.map((item) => ({ inputId: String(item.inputId), qtyKg: item.qtyKg })),
        })),
        remaining,
      ).map((decision) => [decision.id, decision]),
    );
    const farmers = await this.farmers.lookupMany(page.map((doc) => String(doc.farmerId)));
    await this.transaction(async (session) => {
      for (const doc of page) {
        const decision = decisions.get(String(doc._id));
        if (!decision) continue;
        if (decision.covered) await this.markAccepted(doc, decision.accepted, paymentDueAt, farmers, actor, session);
        else await this.markWaitlisted(doc, reason, farmers, actor, session);
      }
    });
    return { processed: page.length, finished: page.length < REQUISITION_CHUNK };
  }

  async declineChunk(
    requisitionId: string,
    reason: string,
    actor: ChunkActor,
  ): Promise<{ processed: number; finished: boolean }> {
    const docs = await this.requests
      .find({
        requisitionId: objectId(requisitionId, 'Invalid requisition'),
        status: RequestStatus.REQUISITIONED,
      })
      .sort({ _id: 1 })
      .limit(REQUISITION_CHUNK)
      .exec();
    if (docs.length === 0) return { processed: 0, finished: true };
    const farmers = await this.farmers.lookupMany(docs.map((doc) => String(doc.farmerId)));
    await this.transaction(async (session) => {
      for (const doc of docs) await this.markDeclined(doc, reason, farmers, actor, session);
    });
    return { processed: docs.length, finished: docs.length < REQUISITION_CHUNK };
  }

  async expireWaitlist(seasonIds: string[], actor: ChunkActor): Promise<number> {
    if (seasonIds.length === 0) return 0;
    const docs = await this.requests
      .find({
        seasonId: { $in: seasonIds.map((id) => objectId(id, 'Invalid season')) },
        status: RequestStatus.REQUISITIONED,
        waitlisted: true,
      })
      .sort({ _id: 1 })
      .limit(REQUISITION_CHUNK)
      .exec();
    if (docs.length === 0) return 0;
    const farmers = await this.farmers.lookupMany(docs.map((doc) => String(doc.farmerId)));
    await this.transaction(async (session) => {
      for (const doc of docs) await this.markDeclined(doc, WAITLIST_REASON, farmers, actor, session);
    });
    return docs.length;
  }

  async pageLinked(
    requisitionId: string,
    query: { cursor?: string; limit?: number },
  ): Promise<{ items: LinkedRequest[]; nextCursor?: string }> {
    const requested = query.limit ?? 50;
    const limit = Number.isInteger(requested) && requested >= 1 && requested <= 100 ? requested : 50;
    const filter: Record<string, unknown> = {
      requisitionId: objectId(requisitionId, 'Invalid requisition'),
    };
    if (query.cursor) filter._id = { $gt: objectId(query.cursor, 'Invalid cursor') };
    const docs = await this.requests.find(filter).sort({ _id: 1 }).limit(limit + 1).lean().exec();
    const page = docs.slice(0, limit);
    const next = docs.length > limit ? page[page.length - 1] : undefined;
    return {
      items: page.map((doc) => ({
        id: String(doc._id),
        farmerId: String(doc.farmerId),
        requestNo: doc.requestNo,
        status: doc.status,
        waitlisted: doc.waitlisted,
        paidAt: doc.paidAt,
        items: doc.items.map((item) => ({
          inputId: String(item.inputId),
          qtyKg: item.qtyKg,
          acceptedQtyKg: item.acceptedQtyKg,
        })),
      })),
      nextCursor: next ? String(next._id) : undefined,
    };
  }

  private approvedFilter(centerId: string, seasonId: string, inputIds: string[]): Record<string, unknown> {
    const ids = inputIds.map((id) => objectId(id, 'Invalid input'));
    return {
      localCenterId: objectId(centerId, 'Invalid center'),
      seasonId: objectId(seasonId, 'Invalid season'),
      status: RequestStatus.APPROVED,
      'items.inputId': { $in: ids },
      items: { $not: { $elemMatch: { inputId: { $nin: ids } } } },
    };
  }

  private async nextAcceptPage(requisitionId: string, policy: PriorityPolicy): Promise<InputRequestDocument[]> {
    const filter = {
      requisitionId: objectId(requisitionId, 'Invalid requisition'),
      status: RequestStatus.REQUISITIONED,
      waitlisted: { $ne: true },
    };
    if (policy !== PriorityPolicy.SMALLEST_LAND_FIRST) {
      return this.requests.find(filter).sort({ reviewedAt: 1, _id: 1 }).limit(REQUISITION_CHUNK).exec();
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
    docs.sort((left, right) => compareApprovalTime({ id: String(left._id), reviewedAt: left.reviewedAt }, { id: String(right._id), reviewedAt: right.reviewedAt }));
    docs.sort((left, right) =>
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
    return docs;
  }

  private async allocatedKg(requisitionId: string): Promise<Map<string, number>> {
    const rows = await this.requests.aggregate<{ _id: Types.ObjectId; qty: number }>([
      {
        $match: {
          requisitionId: objectId(requisitionId, 'Invalid requisition'),
          status: RequestStatus.ACCEPTED,
        },
      },
      { $unwind: '$items' },
      { $group: { _id: '$items.inputId', qty: { $sum: '$items.acceptedQtyKg' } } },
    ]);
    return new Map(rows.map((row) => [String(row._id), row.qty]));
  }

  private async markAccepted(
    doc: InputRequestDocument,
    accepted: { inputId: string; acceptedQtyKg: number }[],
    paymentDueAt: Date,
    farmers: Awaited<ReturnType<FarmersService['lookupMany']>>,
    actor: ChunkActor,
    session: ClientSession,
  ): Promise<void> {
    const items = doc.items.map((item) => ({
      inputId: item.inputId,
      qtyKg: item.qtyKg,
      acceptedQtyKg: accepted.find((row) => row.inputId === String(item.inputId))?.acceptedQtyKg ?? 0,
      unitPriceSantimPerKg: item.unitPriceSantimPerKg,
      subsidySantimPerKg: item.subsidySantimPerKg,
      lineTotalSantim: item.lineTotalSantim,
    }));
    const now = new Date();
    const updated = await this.requests
      .updateOne(
        { _id: doc._id, status: RequestStatus.REQUISITIONED, waitlisted: { $ne: true } },
        {
          $set: { status: RequestStatus.ACCEPTED, items, paymentDueAt, waitlisted: false },
          $push: {
            statusHistory: {
              status: RequestStatus.ACCEPTED,
              at: now,
              actorId: objectIdOrUndefined(actor.userId),
            },
          },
        },
        { session },
      )
      .exec();
    if (updated.matchedCount !== 1) return;
    for (const item of items) {
      const uncovered = item.qtyKg - item.acceptedQtyKg;
      if (uncovered > 0) {
        await this.allocations.release(
          {
            farmerId: String(doc.farmerId),
            seasonId: String(doc.seasonId),
            inputId: String(item.inputId),
            qtyKg: uncovered,
          },
          session,
        );
      }
    }
    const amount = payableSantim(items);
    const quantityKg = items.reduce((sum, item) => sum + item.acceptedQtyKg, 0);
    await this.notify(doc, farmers, session, [
      {
        event: NotificationEvent.REQUEST_ACCEPTED,
        params: { requestNo: doc.requestNo, quantityKg: String(quantityKg) },
      },
      {
        event: NotificationEvent.PAYMENT_REQUIRED,
        params: {
          requestNo: doc.requestNo,
          amount: formatBirr(amount),
          deadline: paymentDueAt.toISOString().slice(0, 10),
          reference: paymentReference(doc.requestNo),
        },
      },
    ]);
    await this.audit.append({
      actor: this.auditActor(actor),
      action: 'REQUEST_ACCEPTED',
      entity: { type: 'input_request', id: String(doc._id) },
      changes: { requestNo: doc.requestNo, quantityKg, amountSantim: amount },
      requestId: actor.requestId,
      localCenterId: String(doc.localCenterId),
      session,
    });
  }

  private async markWaitlisted(
    doc: InputRequestDocument,
    reason: string | undefined,
    farmers: Awaited<ReturnType<FarmersService['lookupMany']>>,
    actor: ChunkActor,
    session: ClientSession,
  ): Promise<void> {
    const updated = await this.requests
      .updateOne(
        { _id: doc._id, status: RequestStatus.REQUISITIONED, waitlisted: { $ne: true } },
        { $set: { waitlisted: true } },
        { session },
      )
      .exec();
    if (updated.matchedCount !== 1) return;
    await this.notify(doc, farmers, session, [
      {
        event: NotificationEvent.REQUEST_WAITLISTED,
        params: { requestNo: doc.requestNo, reason: reason ?? '' },
      },
    ]);
    await this.audit.append({
      actor: this.auditActor(actor),
      action: 'REQUEST_WAITLISTED',
      entity: { type: 'input_request', id: String(doc._id) },
      changes: { requestNo: doc.requestNo },
      requestId: actor.requestId,
      localCenterId: String(doc.localCenterId),
      session,
    });
  }

  private async markDeclined(
    doc: InputRequestDocument,
    reason: string,
    farmers: Awaited<ReturnType<FarmersService['lookupMany']>>,
    actor: ChunkActor,
    session: ClientSession,
  ): Promise<void> {
    const now = new Date();
    const updated = await this.requests
      .updateOne(
        { _id: doc._id, status: RequestStatus.REQUISITIONED },
        {
          $set: { status: RequestStatus.DECLINED, waitlisted: false, rejectionReason: reason },
          $push: {
            statusHistory: {
              status: RequestStatus.DECLINED,
              at: now,
              actorId: objectIdOrUndefined(actor.userId),
              reason,
            },
          },
        },
        { session },
      )
      .exec();
    if (updated.matchedCount !== 1) return;
    for (const item of doc.items) {
      await this.allocations.release(
        {
          farmerId: String(doc.farmerId),
          seasonId: String(doc.seasonId),
          inputId: String(item.inputId),
          qtyKg: item.qtyKg,
        },
        session,
      );
    }
    await this.notify(doc, farmers, session, [
      {
        event: NotificationEvent.REQUEST_DECLINED,
        params: { requestNo: doc.requestNo, reason },
      },
    ]);
    await this.audit.append({
      actor: this.auditActor(actor),
      action: 'REQUEST_DECLINED',
      entity: { type: 'input_request', id: String(doc._id) },
      changes: { requestNo: doc.requestNo, reason },
      requestId: actor.requestId,
      localCenterId: String(doc.localCenterId),
      session,
    });
  }

  private async notify(
    doc: InputRequestDocument,
    farmers: Awaited<ReturnType<FarmersService['lookupMany']>>,
    session: ClientSession,
    messages: { event: NotificationEvent; params: Record<string, string> }[],
  ): Promise<void> {
    const farmer = farmers.get(String(doc.farmerId));
    const language = await this.languageFor(farmer?.userId);
    for (const message of messages) {
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
  }

  private async languageFor(userId?: string): Promise<NotificationLanguage> {
    if (!userId) return 'en';
    const user = await this.users.findById(userId);
    if (user?.preferredLanguage === 'am' || user?.preferredLanguage === 'om') return user.preferredLanguage;
    return 'en';
  }

  private auditActor(actor: ChunkActor) {
    return { userId: actor.userId, role: actor.role, ip: actor.ip, userAgent: actor.userAgent };
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

function objectId(id: string, message: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, message);
  return new Types.ObjectId(id);
}

function objectIdOrUndefined(id: string): Types.ObjectId | undefined {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined;
}
