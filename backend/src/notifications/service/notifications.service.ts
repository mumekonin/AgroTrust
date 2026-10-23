import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types, type ClientSession, type Connection, type Model } from 'mongoose';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { normalizeEthiopianPhone } from '../../common/utils/phone.util.js';
import type { Env } from '../../config/env.schema.js';
import { FarmersService } from '../../farmers/service/farmers.service.js';
import { FraudService } from '../../fraud/service/fraud.service.js';
import {
  toNotificationResponse,
  type NotificationListResponse,
  type NotificationResponse,
} from '../response/notifications.response.js';
import {
  Notification,
  NotificationStatus,
  type NotificationDocument,
  type NotificationEvent,
  type NotificationLanguage,
  type NotificationStatus as NotificationStatusValue,
} from '../schema/notification.schema.js';
import { SmsGateway } from './sms-gateway.js';
import {
  MAX_SMS_ATTEMPTS,
  nextRetryAt,
  redactSecrets,
  renderTemplate,
} from './sms-templates.js';

const DEFAULT_LIMIT = 50;
const LEASE_MS = 2 * 60 * 1000;
const DISPATCH_BATCH = 25;

export interface EnqueueNotificationInput {
  farmerId?: string;
  userId?: string;
  phone?: string;
  event: NotificationEvent;
  language?: NotificationLanguage;
  params?: Record<string, string>;
  related: { type: string; id: string };
  session?: ClientSession;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly notifications: Model<Notification>,
    private readonly farmers: FarmersService,
    private readonly gateway: SmsGateway,
    private readonly config: ConfigService<Env, true>,
    @Optional() private readonly fraud?: FraudService,
    @Optional() @InjectConnection() private readonly connection?: Connection,
  ) {}

  async enqueue(input: EnqueueNotificationInput): Promise<NotificationResponse> {
    const existing = await this.notifications
      .findOne({
        'related.type': input.related.type,
        'related.id': input.related.id,
        event: input.event,
      })
      .session(input.session ?? null)
      .exec();
    if (existing) return toNotificationResponse(existing, { redact: true });

    const phone = input.phone ? this.phone(input.phone) : undefined;
    const language = input.language ?? 'en';
    const params = input.params ?? {};
    const manual = !phone;
    const [doc] = await this.notifications.create(
      [
        {
          recipient: {
            farmerId: input.farmerId ? new Types.ObjectId(input.farmerId) : undefined,
            userId: input.userId ? new Types.ObjectId(input.userId) : undefined,
            phone,
          },
          event: input.event,
          language,
          params,
          body: manual ? renderTemplate(input.event, language, params) : undefined,
          status: manual ? NotificationStatus.MANUAL : NotificationStatus.QUEUED,
          attempts: 0,
          nextAttemptAt: manual ? undefined : new Date(),
          related: { type: input.related.type, id: input.related.id },
        },
      ],
      { session: input.session },
    );
    return toNotificationResponse(doc, { redact: true });
  }

  async listMine(
    principal: Principal,
    query: { cursor?: string; limit?: number },
  ): Promise<NotificationListResponse> {
    const mine: Record<string, unknown>[] = [
      { 'recipient.userId': objectId(principal.userId, 'Invalid user') },
    ];
    if (principal.farmerId) {
      mine.push({ 'recipient.farmerId': objectId(principal.farmerId, 'Invalid farmer') });
    }
    return this.page({ $or: mine, status: { $ne: NotificationStatus.QUEUED } }, query, true);
  }

  async listManual(
    principal: Principal,
    query: { cursor?: string; limit?: number },
  ): Promise<NotificationListResponse> {
    const filter: Record<string, unknown> = { status: NotificationStatus.MANUAL };
    const farmerIds = await this.farmers.matchingIds(principal);
    if (farmerIds) {
      filter['recipient.farmerId'] = { $in: farmerIds.map((id) => new Types.ObjectId(id)) };
    }
    return this.page(filter, query, false);
  }

  async listForAdmin(
    principal: Principal,
    query: { status?: NotificationStatusValue; cursor?: string; limit?: number },
  ): Promise<NotificationListResponse> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    const farmerIds = await this.farmers.matchingIds(principal);
    if (farmerIds) {
      filter['recipient.farmerId'] = { $in: farmerIds.map((id) => new Types.ObjectId(id)) };
    }
    return this.page(filter, query, true);
  }

  async dispatchDue(now: Date): Promise<number> {
    await this.alertBudget(now);
    let sent = 0;
    for (let i = 0; i < DISPATCH_BATCH; i += 1) {
      const claimed = await this.claim(now);
      if (!claimed) break;
      const delivered = await this.sendOne(claimed, now);
      if (delivered) sent += 1;
    }
    return sent;
  }

  async outboxDepth(now = new Date()): Promise<{ queued: number; oldestAgeSeconds: number }> {
    const queued = await this.notifications.countDocuments({ status: NotificationStatus.QUEUED }).exec();
    const oldest = await this.notifications
      .findOne({ status: NotificationStatus.QUEUED })
      .sort({ createdAt: 1 })
      .select({ createdAt: 1 })
      .lean<{ createdAt?: Date }>()
      .exec();
    const createdAt = oldest?.createdAt ? new Date(oldest.createdAt) : undefined;
    const oldestAgeSeconds = createdAt ? Math.max(0, (now.getTime() - createdAt.getTime()) / 1000) : 0;
    return { queued, oldestAgeSeconds };
  }

  private async alertBudget(now: Date): Promise<void> {
    const budget = this.config.get('SMS_DAILY_BUDGET', { infer: true });
    const fraud = this.fraud;
    const connection = this.connection;
    if (typeof budget !== 'number' || budget <= 0 || !fraud || !connection) return;
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const count = await this.notifications.countDocuments({
      status: { $in: [NotificationStatus.SENT, NotificationStatus.DELIVERED] },
      updatedAt: { $gte: start },
    });
    if (count < budget) return;
    const date = start.toISOString().slice(0, 10);
    if (await fraud.hasOpen('sms_budget', { date })) return;
    const session = await connection.startSession();
    try {
      await session.withTransaction(() =>
        fraud.open({ type: 'sms_budget', severity: 'medium', details: { date, count, budget } }, session),
      );
    } finally {
      await session.endSession();
    }
  }

  async applyDeliveryReport(
    input: { providerMessageId: string; status: 'delivered' | 'failed' },
    signature: string | undefined,
  ): Promise<NotificationResponse> {
    const expected = smsSignature(
      this.config.get('AUTH_PEPPER', { infer: true }),
      input.providerMessageId,
      input.status,
    );
    if (!signature || !signaturesMatch(expected, signature)) {
      throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid signature', 401);
    }
    const doc = await this.notifications.findOne({ providerMessageId: input.providerMessageId }).exec();
    if (!doc) throw new AppException(ErrorCode.NOT_FOUND, 'Notification not found', 404);
    if (input.status === 'delivered') {
      if (doc.status !== NotificationStatus.DELIVERED) {
        doc.status = NotificationStatus.DELIVERED;
        doc.body = redactSecrets(doc.body ?? '', doc.params, doc.event);
        await doc.save();
      }
      return toNotificationResponse(doc, { redact: true });
    }
    if (doc.status !== NotificationStatus.MANUAL) {
      doc.status = NotificationStatus.MANUAL;
      doc.failureReason = 'The provider could not deliver this message';
      await doc.save();
    }
    return toNotificationResponse(doc, { redact: false });
  }

  private async claim(now: Date): Promise<NotificationDocument | null> {
    return this.notifications
      .findOneAndUpdate(
        {
          status: NotificationStatus.QUEUED,
          attempts: { $lt: MAX_SMS_ATTEMPTS },
          $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: now } }],
        },
        { $set: { nextAttemptAt: new Date(now.getTime() + LEASE_MS) } },
        { sort: { nextAttemptAt: 1 }, new: true },
      )
      .exec();
  }

  private async sendOne(doc: NotificationDocument, now: Date): Promise<boolean> {
    const phone = doc.recipient.phone;
    if (!phone) {
      doc.status = NotificationStatus.MANUAL;
      doc.body = doc.body ?? renderTemplate(doc.event, doc.language, doc.params ?? {});
      doc.failureReason = 'No phone number';
      await doc.save();
      return false;
    }
    const body = renderTemplate(doc.event, doc.language, doc.params ?? {});
    try {
      const result = await this.gateway.send({ to: phone, body });
      doc.body = body;
      doc.status = NotificationStatus.SENT;
      doc.providerMessageId = result.providerMessageId;
      doc.failureReason = undefined;
      await doc.save();
      return true;
    } catch {
      doc.attempts += 1;
      doc.body = body;
      const retryAt = nextRetryAt(doc.attempts, now);
      if (!retryAt) {
        doc.status = NotificationStatus.MANUAL;
        doc.failureReason = 'Could not send the message';
      } else {
        doc.status = NotificationStatus.QUEUED;
        doc.nextAttemptAt = retryAt;
        doc.failureReason = 'Could not send the message';
      }
      await doc.save();
      return false;
    }
  }

  private async page(
    filter: Record<string, unknown>,
    query: { cursor?: string; limit?: number },
    redact: boolean,
  ): Promise<NotificationListResponse> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    if (query.cursor) filter._id = { $gt: objectId(query.cursor, 'Invalid cursor') };
    const docs = await this.notifications
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean()
      .exec();
    const page = docs.slice(0, limit);
    const next = docs.length > limit ? page[page.length - 1] : undefined;
    return {
      items: page.map((doc) => toNotificationResponse(doc, { redact })),
      nextCursor: next ? String(next._id) : undefined,
    };
  }

  private phone(input: string): string {
    const phone = normalizeEthiopianPhone(input);
    if (!phone) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid Ethiopian phone number');
    return phone;
  }
}

export function smsSignature(secret: string, providerMessageId: string, status: string): string {
  return createHmac('sha256', secret).update(`${providerMessageId}.${status}`).digest('hex');
}

export function signaturesMatch(expected: string, received: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function objectId(id: string, message: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, message);
  return new Types.ObjectId(id);
}
