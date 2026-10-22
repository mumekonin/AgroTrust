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
var SessionService_1;
import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { AuthSession } from '../schema/auth-session.schema.js';
import { RefreshToken } from '../schema/refresh-token.schema.js';
import { SESSION_POLICY, TokenService, primaryRole } from './token.service.js';
const invalidSession = () => new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired session', 401);
let SessionService = SessionService_1 = class SessionService {
    sessionModel;
    refreshModel;
    tokens;
    logger = new Logger(SessionService_1.name);
    constructor(sessionModel, refreshModel, tokens) {
        this.sessionModel = sessionModel;
        this.refreshModel = refreshModel;
        this.tokens = tokens;
    }
    async create(input) {
        const role = primaryRole(input.roles);
        const policy = SESSION_POLICY[role];
        const now = new Date();
        const absoluteExpiresAt = new Date(now.getTime() + policy.absoluteSeconds * 1000);
        const sid = randomUUID();
        const family = randomUUID();
        await this.sessionModel.create({
            sid,
            userId: new Types.ObjectId(input.userId),
            role,
            family,
            deviceId: input.deviceId,
            deviceLabel: input.deviceLabel,
            userAgent: input.userAgent,
            ip: input.ip,
            lastSeenAt: now,
            absoluteExpiresAt,
            authMethod: input.authMethod,
        });
        const refresh = this.tokens.generateRefreshToken();
        const refreshExpiresAt = this.refreshExpiry(now, policy.idleSeconds, absoluteExpiresAt);
        await this.refreshModel.create({
            sid,
            family,
            tokenHash: refresh.hash,
            expiresAt: refreshExpiresAt,
        });
        return { sid, role, refreshToken: refresh.token, refreshExpiresAt, absoluteExpiresAt };
    }
    async rotate(rawToken) {
        const tokenHash = this.tokens.hashRefreshToken(rawToken);
        const now = new Date();
        const claimed = await this.refreshModel
            .findOneAndUpdate({ tokenHash, usedAt: { $exists: false }, expiresAt: { $gt: now } }, { $set: { usedAt: now } }, { new: true })
            .exec();
        if (!claimed) {
            const existing = await this.refreshModel.findOne({ tokenHash }).exec();
            if (existing?.usedAt) {
                await this.revokeFamily(existing.family, existing.sid, 'REFRESH_REUSE_DETECTED');
                this.logger.warn(`Refresh token reuse detected for session ${existing.sid}`);
            }
            throw invalidSession();
        }
        const session = await this.sessionModel.findOne({ sid: claimed.sid }).exec();
        if (!session || session.revokedAt || session.absoluteExpiresAt <= now) {
            throw invalidSession();
        }
        const role = session.role;
        const next = this.tokens.generateRefreshToken();
        const refreshExpiresAt = this.refreshExpiry(now, SESSION_POLICY[role].idleSeconds, session.absoluteExpiresAt);
        const created = await this.refreshModel.create({
            sid: session.sid,
            family: claimed.family,
            tokenHash: next.hash,
            expiresAt: refreshExpiresAt,
        });
        await this.refreshModel
            .updateOne({ _id: claimed._id }, { $set: { replacedBy: created._id } })
            .exec();
        await this.sessionModel.updateOne({ sid: session.sid }, { $set: { lastSeenAt: now } }).exec();
        return {
            sid: session.sid,
            userId: String(session.userId),
            role,
            refreshToken: next.token,
            refreshExpiresAt,
        };
    }
    findActive(sid) {
        return this.sessionModel
            .findOne({ sid, revokedAt: { $exists: false }, absoluteExpiresAt: { $gt: new Date() } })
            .lean()
            .exec();
    }
    listActiveForUser(userId) {
        return this.sessionModel
            .find({
            userId: new Types.ObjectId(userId),
            revokedAt: { $exists: false },
            absoluteExpiresAt: { $gt: new Date() },
        })
            .sort({ lastSeenAt: -1 })
            .lean()
            .exec();
    }
    async revokeSession(sid, reason) {
        const session = await this.sessionModel.findOne({ sid }).exec();
        if (!session)
            return;
        await this.revokeFamily(session.family, sid, reason);
    }
    async revokeAllForUser(userId, reason, options = {}) {
        const now = new Date();
        const filter = {
            userId: new Types.ObjectId(userId),
            revokedAt: { $exists: false },
        };
        if (options.exceptSid)
            filter['sid'] = { $ne: options.exceptSid };
        const sessions = await this.sessionModel
            .find(filter, { sid: 1 })
            .session(options.session ?? null)
            .lean()
            .exec();
        if (sessions.length === 0)
            return 0;
        const sids = sessions.map((s) => s.sid);
        await this.sessionModel
            .updateMany({ sid: { $in: sids } }, { $set: { revokedAt: now, revokedReason: reason } }, { session: options.session })
            .exec();
        await this.refreshModel
            .updateMany({ sid: { $in: sids }, usedAt: { $exists: false } }, { $set: { usedAt: now } }, { session: options.session })
            .exec();
        return sids.length;
    }
    async setStepUp(sid, until) {
        await this.sessionModel.updateOne({ sid }, { $set: { stepUpUntil: until } }).exec();
    }
    async revokeFamily(family, sid, reason) {
        const now = new Date();
        await this.sessionModel
            .updateOne({ sid, revokedAt: { $exists: false } }, { $set: { revokedAt: now, revokedReason: reason } })
            .exec();
        await this.refreshModel
            .updateMany({ family, usedAt: { $exists: false } }, { $set: { usedAt: now } })
            .exec();
    }
    refreshExpiry(now, idleSeconds, absoluteExpiresAt) {
        return new Date(Math.min(now.getTime() + idleSeconds * 1000, absoluteExpiresAt.getTime()));
    }
};
SessionService = SessionService_1 = __decorate([
    Injectable(),
    __param(0, InjectModel(AuthSession.name)),
    __param(1, InjectModel(RefreshToken.name)),
    __metadata("design:paramtypes", [Function, Function, TokenService])
], SessionService);
export { SessionService };
//# sourceMappingURL=session.service.js.map