var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { OtpChallenge } from '../schema/otp-challenge.schema.js';
const FIVE_MINUTES = 5 * 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const MAX_PER_HOUR = 5;
const MAX_PER_DAY = 10;
const COOLDOWN_MS = 60_000;
export function hashOtp(value, pepper) {
    return createHmac('sha256', pepper).update(value).digest('hex');
}
export function otpMatches(value, hash, pepper) {
    const left = Buffer.from(hashOtp(value, pepper));
    const right = Buffer.from(hash);
    if (left.length !== right.length)
        return false;
    return timingSafeEqual(left, right);
}
export function otpSendBlocked(input) {
    if (input.sentLastHour >= MAX_PER_HOUR || input.sentLastDay >= MAX_PER_DAY)
        return true;
    if (!input.lastSentAt)
        return false;
    return input.now.getTime() - input.lastSentAt.getTime() < COOLDOWN_MS;
}
let OtpService = class OtpService {
    model;
    pepper;
    constructor(model, config) {
        this.model = model;
        this.pepper = config.get('AUTH_PEPPER', { infer: true });
    }
    async issue(input) {
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
    async peek(id, purpose) {
        const doc = await this.model.findById(id).exec();
        if (!doc || doc.consumedAt || doc.expiresAt <= new Date() || doc.purpose !== purpose) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
        }
        return { userId: doc.userId ? String(doc.userId) : undefined };
    }
    async consumeId(id) {
        await this.model.updateOne({ _id: id }, { $set: { consumedAt: new Date() } }).exec();
    }
    async verifyToken(purpose, token) {
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
    async verify(id, code, purpose) {
        const doc = await this.model.findById(id).exec();
        return this.consume(doc, code, purpose);
    }
    async verifyLatest(input) {
        const filter = {
            purpose: input.purpose,
            consumedAt: { $exists: false },
        };
        if (input.phone)
            filter['phone'] = input.phone;
        if (input.userId)
            filter['userId'] = new Types.ObjectId(input.userId);
        const doc = await this.model.findOne(filter).sort({ createdAt: -1 }).exec();
        const consumed = await this.consume(doc, input.code, input.purpose);
        return { id: String(doc?._id), payloadHash: consumed.payloadHash };
    }
    async consume(doc, code, purpose) {
        const now = new Date();
        const usable = doc &&
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
    async assertCanSend(input, now) {
        const filter = { purpose: input.purpose };
        if (input.phone)
            filter['phone'] = input.phone;
        else if (input.userId)
            filter['userId'] = new Types.ObjectId(input.userId);
        else
            return;
        const [sentLastHour, sentLastDay, latest] = await Promise.all([
            this.model.countDocuments({ ...filter, createdAt: { $gte: new Date(now.getTime() - HOUR) } }),
            this.model.countDocuments({ ...filter, createdAt: { $gte: new Date(now.getTime() - DAY) } }),
            this.model.findOne(filter).sort({ createdAt: -1 }).select({ createdAt: 1 }).lean().exec(),
        ]);
        if (otpSendBlocked({
            sentLastHour,
            sentLastDay,
            lastSentAt: latest?.createdAt,
            now,
        })) {
            throw new AppException(ErrorCode.TOO_MANY_REQUESTS, 'Too many attempts. Try again later.', 429);
        }
    }
};
OtpService = __decorate([
    Injectable(),
    __param(0, InjectModel(OtpChallenge.name)),
    __metadata("design:paramtypes", [Function, ConfigService])
], OtpService);
export { OtpService };
//# sourceMappingURL=otp.service.js.map