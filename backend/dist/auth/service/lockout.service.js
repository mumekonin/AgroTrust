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
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { UserStatus as UserStatusValue } from '../../users/schema/user.schema.js';
import { LoginAttempt } from '../schema/login-attempt.schema.js';
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const IP_LIMIT_PER_MINUTE = 20;
const IP_LIMIT_PER_HOUR = 100;
const FAILURES_BEFORE_SHORT_LOCK = 5;
const SHORT_LOCK_MS = 15 * MINUTE_MS;
const FAILURES_BEFORE_LONG_LOCK = 10;
const LONG_LOCK_MS = HOUR_MS;
const FAILURES_BEFORE_ACCOUNT_LOCK = 20;
export function consecutiveFailures(attempts) {
    let count = 0;
    let lastFailureAt;
    for (const attempt of attempts) {
        if (attempt.success)
            break;
        count += 1;
        lastFailureAt ??= attempt.at;
    }
    return { count, lastFailureAt };
}
export function failureIsLockout(consecutive) {
    return consecutive >= FAILURES_BEFORE_SHORT_LOCK;
}
export function shouldLockAccount(consecutive) {
    return consecutive >= FAILURES_BEFORE_ACCOUNT_LOCK;
}
export function lockoutFromFailures(consecutive, lastFailureAt, now, status) {
    if (status === UserStatusValue.LOCKED ||
        consecutive >= FAILURES_BEFORE_ACCOUNT_LOCK) {
        return 'locked';
    }
    if (!lastFailureAt || consecutive < FAILURES_BEFORE_SHORT_LOCK)
        return 'ok';
    const elapsed = now.getTime() - lastFailureAt.getTime();
    if (consecutive >= FAILURES_BEFORE_LONG_LOCK && elapsed < LONG_LOCK_MS)
        return 'locked';
    if (consecutive >= FAILURES_BEFORE_SHORT_LOCK && elapsed < SHORT_LOCK_MS)
        return 'locked';
    return 'ok';
}
let LockoutService = class LockoutService {
    attempts;
    constructor(attempts) {
        this.attempts = attempts;
    }
    async evaluate(identifierHash, ip, status) {
        const now = Date.now();
        const [perMinute, perHour, recent] = await Promise.all([
            this.attempts.countDocuments({
                ip,
                at: { $gte: new Date(now - MINUTE_MS) },
            }),
            this.attempts.countDocuments({
                ip,
                at: { $gte: new Date(now - HOUR_MS) },
            }),
            this.recent(identifierHash),
        ]);
        const { count, lastFailureAt } = consecutiveFailures(recent);
        return {
            ipBlocked: perMinute >= IP_LIMIT_PER_MINUTE || perHour >= IP_LIMIT_PER_HOUR,
            accountBlocked: lockoutFromFailures(count, lastFailureAt, new Date(now), status) ===
                'locked',
        };
    }
    async recordFailure(input) {
        await this.insert({ ...input, success: false });
        const { count } = consecutiveFailures(await this.recent(input.identifierHash));
        return count;
    }
    async recordSuccess(input) {
        await this.insert({ ...input, success: true, reason: 'login_success' });
    }
    recent(identifierHash) {
        return this.attempts
            .find({ identifierHash })
            .sort({ at: -1 })
            .limit(FAILURES_BEFORE_ACCOUNT_LOCK)
            .select({ success: 1, at: 1 })
            .lean()
            .exec();
    }
    insert(input) {
        return this.attempts.create({
            identifierHash: input.identifierHash,
            ip: input.ip,
            userId: input.userId ? new Types.ObjectId(input.userId) : undefined,
            success: input.success,
            reason: input.reason,
            at: new Date(),
        });
    }
};
LockoutService = __decorate([
    Injectable(),
    __param(0, InjectModel(LoginAttempt.name)),
    __metadata("design:paramtypes", [Function])
], LockoutService);
export { LockoutService };
//# sourceMappingURL=lockout.service.js.map