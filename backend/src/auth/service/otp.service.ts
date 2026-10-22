import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Env } from '../../config/env.schema.js';
import { OtpChallenge, type OtpChallengeDocument, type OtpPurpose } from '../schema/otp-challenge.schema.js';

const FIVE_MINUTES = 5 * 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const MAX_PER_HOUR = 5;
const MAX_PER_DAY = 10;
const COOLDOWN_MS = 60_000;

export function hashOtp(value: string, pepper: string): string {
  return createHmac('sha256', pepper).update(value).digest('hex');
}

export function otpMatches(value: string, hash: string, pepper: string): boolean {
  const left = Buffer.from(hashOtp(value, pepper));
  const right = Buffer.from(hash);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** §3.6. Five sends an hour, ten a day, and a 60 second cooldown. */
export function otpSendBlocked(input: {
  sentLastHour: number;
  sentLastDay: number;
  lastSentAt?: Date;
  now: Date;
}): boolean {
  if (input.sentLastHour >= MAX_PER_HOUR || input.sentLastDay >= MAX_PER_DAY) return true;
  if (!input.lastSentAt) return false;
  return input.now.getTime() - input.lastSentAt.getTime() < COOLDOWN_MS;
}

@Injectable()
export class OtpService {
  private readonly pepper: string;

  constructor(
    @InjectModel(OtpChallenge.name) private readonly model: Model<OtpChallenge>,
    config: ConfigService<Env, true>,
  ) {
    this.pepper = config.get('AUTH_PEPPER', { infer: true });
  }

  /**
   * Creates a challenge. The plaintext is returned only to the caller.
   * HTTP handlers must not put it in the response. SMS delivery is the notifications module.
   */
  async issue(input: {
    userId?: string;
    phone?: string;
    purpose: OtpPurpose;
    payloadHash?: string;
    secret?: string;
    ttlMs?: number;
  }): Promise<{ id: string; code: string }> {
    const now = new Date();
    await this.assertCanSend(input, now);
    const code = input.secret ?? randomInt(0, 1_000_000).toString().padStart(6, '0');
    const doc = await this.model.create({
      userId: input.userId ? new Types.ObjectId(input.userId) : undefined,
      phone: input.phone,
      purpose: input.purpose,
      codeHash: hashOtp(code, this.pepper),
      payloadHash: input.payloadHash,
      attempts: 0,
      maxAttempts: 3,
      resendCount: 0,
      expiresAt: new Date(now.getTime() + (input.ttlMs ?? FIVE_MINUTES)),
    });
    return { id: String(doc._id), code };
  }

  async peek(id: string, purpose: OtpPurpose): Promise<{ userId?: string }> {
    const doc = await this.model.findById(id).exec();
    if (!doc || doc.consumedAt || doc.expiresAt <= new Date() || doc.purpose !== purpose) {
      throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
    }
    return { userId: doc.userId ? String(doc.userId) : undefined };
  }

  async consumeId(id: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { $set: { consumedAt: new Date() } }).exec();
  }

  async verifyToken(purpose: OtpPurpose, token: string): Promise<{ userId?: string }> {
    const doc = await this.model
      .findOne({
        purpose,
        codeHash: hashOtp(token, this.pepper),
        consumedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      })
      .exec();
    return this.consume(doc, token, purpose);
  }

  async verify(id: string, code: string, purpose?: OtpPurpose): Promise<{ userId?: string; payloadHash?: string }> {
    const doc = await this.model.findById(id).exec();
    return this.consume(doc, code, purpose);
  }

  async verifyLatest(input: {
    phone?: string;
    userId?: string;
    purpose: OtpPurpose;
    code: string;
  }): Promise<{ id: string; payloadHash?: string }> {
    const filter: Record<string, unknown> = {
      purpose: input.purpose,
      consumedAt: { $exists: false },
    };
    if (input.phone) filter['phone'] = input.phone;
    if (input.userId) filter['userId'] = new Types.ObjectId(input.userId);
    const doc = await this.model.findOne(filter).sort({ createdAt: -1 }).exec();
    const consumed = await this.consume(doc, input.code, input.purpose);
    return { id: String(doc?._id), payloadHash: consumed.payloadHash };
  }

  private async consume(
    doc: OtpChallengeDocument | null,
    code: string,
    purpose?: OtpPurpose,
  ): Promise<{ userId?: string; payloadHash?: string }> {
    const now = new Date();
    const usable =
      doc &&
      !doc.consumedAt &&
      doc.expiresAt > now &&
      doc.attempts < doc.maxAttempts &&
      (!purpose || doc.purpose === purpose);
    const ok = usable ? otpMatches(code, doc.codeHash, this.pepper) : otpMatches(code, hashOtp('000000', this.pepper), this.pepper) && false;

    if (!usable || !ok) {
      if (doc && !doc.consumedAt) {
        await this.model.updateOne({ _id: doc._id }, { $inc: { attempts: 1 } }).exec();
      }
      throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
    }

    await this.model.updateOne({ _id: doc._id }, { $set: { consumedAt: now } }).exec();
    return { userId: doc.userId ? String(doc.userId) : undefined, payloadHash: doc.payloadHash };
  }

  private async assertCanSend(
    input: { phone?: string; userId?: string; purpose: OtpPurpose },
    now: Date,
  ): Promise<void> {
    const filter: Record<string, unknown> = { purpose: input.purpose };
    if (input.phone) filter['phone'] = input.phone;
    else if (input.userId) filter['userId'] = new Types.ObjectId(input.userId);
    else return;

    const [sentLastHour, sentLastDay, latest] = await Promise.all([
      this.model.countDocuments({ ...filter, createdAt: { $gte: new Date(now.getTime() - HOUR) } }),
      this.model.countDocuments({ ...filter, createdAt: { $gte: new Date(now.getTime() - DAY) } }),
      this.model.findOne(filter).sort({ createdAt: -1 }).select({ createdAt: 1 }).lean().exec(),
    ]);
    if (
      otpSendBlocked({
        sentLastHour,
        sentLastDay,
        lastSentAt: latest?.createdAt,
        now,
      })
    ) {
      throw new AppException(ErrorCode.TOO_MANY_REQUESTS, 'Too many attempts. Try again later.', 429);
    }
  }
}
