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
import { createHmac, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CredentialType, UserCredential } from '../schema/user-credential.schema.js';
const ARGON2_PARAMS = { memoryCost: 65_536, timeCost: 3, parallelism: 1 };
const ARGON2_OPTIONS = { type: argon2.argon2id, ...ARGON2_PARAMS };
const PASSWORD_HISTORY_SIZE = 5;
const MIN_PASSWORD_LENGTH = {
    [Role.LOCAL_ADMIN]: 12,
    [Role.DISTRIBUTOR_STAFF]: 12,
    [Role.REGIONAL_ADMIN]: 14,
    [Role.NATIONAL_ADMIN]: 14,
    [Role.AUDITOR]: 14,
};
const MAX_PASSWORD_LENGTH = 128;
const WEAK_PINS = new Set([
    '000000', '123456', '654321', '112233', '159753', '696969', '123321', '111222', '121212',
]);
const COMMON_PASSWORDS = new Set([
    'passwordpassword', 'password1234', 'password12345', 'password123456', 'administrator',
    'administrator1', 'administrator12', '111111111111', '123456789012', '1234567890123',
    'qwertyuiopas', 'qwertyuiop12', 'qwertyqwerty', 'abcdefghijkl', 'iloveyou1234',
    'welcome12345', 'letmein12345', 'ethiopia12345', 'ethiopia1234', 'agrotrust1234',
    'agrotrust12345', 'changeme1234', 'changemechangeme', 'adminadminadmin',
]);
const YEAR_START = /^(19[4-9]\d|20[0-2]\d)/;
const YEAR_END = /(19[4-9]\d|20[0-2]\d)$/;
export function checkPin(pin, ctx = {}) {
    if (!/^\d{6}$/.test(pin))
        return 'PIN must be exactly 6 digits';
    if (WEAK_PINS.has(pin))
        return 'PIN is too easy to guess';
    if (/^(\d)\1{5}$/.test(pin))
        return 'PIN is too easy to guess';
    if ('0123456789'.includes(pin) || '9876543210'.includes(pin))
        return 'PIN is too easy to guess';
    if (/^(\d\d)\1\1$/.test(pin) || /^(\d{3})\1$/.test(pin))
        return 'PIN is too easy to guess';
    if (YEAR_START.test(pin) || YEAR_END.test(pin))
        return 'PIN must not look like a year';
    const phoneDigits = ctx.phone?.replace(/\D/g, '') ?? '';
    if (phoneDigits.length >= 6 && phoneDigits.slice(-6) === pin) {
        return 'PIN must not be part of your phone number';
    }
    return null;
}
export function checkPassword(password, role, ctx = {}) {
    const minLength = MIN_PASSWORD_LENGTH[role];
    if (minLength === undefined)
        return 'This role signs in with a PIN, not a password';
    if (password.length < minLength)
        return `Password must be at least ${minLength} characters`;
    if (password.length > MAX_PASSWORD_LENGTH) {
        return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
    }
    const lower = password.toLowerCase();
    if (COMMON_PASSWORDS.has(lower))
        return 'Password is too common';
    if (/^(.)\1+$/.test(password))
        return 'Password is too easy to guess';
    const nameParts = (ctx.fullName ?? '')
        .toLowerCase()
        .split(/\s+/)
        .filter((part) => part.length >= 4);
    if (nameParts.some((part) => lower.includes(part)))
        return 'Password must not contain your name';
    const phoneDigits = ctx.phone?.replace(/\D/g, '') ?? '';
    if (phoneDigits.length >= 7 && lower.includes(phoneDigits.slice(-7))) {
        return 'Password must not contain your phone number';
    }
    const emailLocal = ctx.email?.split('@')[0]?.toLowerCase() ?? '';
    if (emailLocal.length >= 4 && lower.includes(emailLocal)) {
        return 'Password must not contain your email name';
    }
    return null;
}
class Semaphore {
    max;
    active = 0;
    waiting = [];
    constructor(max) {
        this.max = max;
    }
    async acquire() {
        if (this.active < this.max) {
            this.active++;
            return;
        }
        await new Promise((resolve) => this.waiting.push(resolve));
    }
    release() {
        const next = this.waiting.shift();
        if (next)
            next();
        else
            this.active--;
    }
}
let CredentialService = class CredentialService {
    model;
    pepper;
    gate;
    dummyHash;
    constructor(model, config) {
        this.model = model;
        this.pepper = config.get('AUTH_PEPPER', { infer: true });
        this.gate = new Semaphore(config.get('ARGON2_MAX_CONCURRENCY', { infer: true }));
    }
    assertValidPin(pin, ctx = {}) {
        const problem = checkPin(pin, ctx);
        if (problem)
            throw new AppException(ErrorCode.VALIDATION_FAILED, problem);
    }
    assertValidPassword(password, role, ctx = {}) {
        const problem = checkPassword(password, role, ctx);
        if (problem)
            throw new AppException(ErrorCode.VALIDATION_FAILED, problem);
    }
    peppered(secret) {
        return createHmac('sha256', this.pepper).update(secret).digest('base64');
    }
    async hashSecret(secret) {
        await this.gate.acquire();
        try {
            return await argon2.hash(this.peppered(secret), { ...ARGON2_OPTIONS, raw: false });
        }
        finally {
            this.gate.release();
        }
    }
    async verifyHash(hash, secret) {
        await this.gate.acquire();
        try {
            return await argon2.verify(hash, this.peppered(secret));
        }
        catch {
            return false;
        }
        finally {
            this.gate.release();
        }
    }
    getDummyHash() {
        this.dummyHash ??= this.hashSecret(randomBytes(16).toString('hex'));
        return this.dummyHash;
    }
    async hasCredential(userId, type) {
        return (await this.model.exists({ userId: new Types.ObjectId(userId), type })) !== null;
    }
    async setSecret(userId, type, secret, options = {}, session) {
        const uid = new Types.ObjectId(userId);
        const hash = await this.hashSecret(secret);
        const set = {
            hash,
            algo: 'argon2id',
            params: { ...ARGON2_PARAMS },
            mustChange: options.mustChange ?? false,
            changedAt: new Date(),
        };
        if (type === CredentialType.PASSWORD) {
            const existing = await this.model
                .findOne({ userId: uid, type })
                .select('+history')
                .session(session ?? null)
                .exec();
            set['history'] = [existing?.hash, ...(existing?.history ?? [])]
                .filter((value) => Boolean(value))
                .slice(0, PASSWORD_HISTORY_SIZE);
        }
        await this.model
            .updateOne({ userId: uid, type }, { $set: set }, { upsert: true, session })
            .exec();
    }
    async verifySecret(userId, type, secret) {
        const credential = await this.model
            .findOne({ userId: new Types.ObjectId(userId), type })
            .exec();
        if (!credential?.hash) {
            await this.verifyHash(await this.getDummyHash(), secret);
            return false;
        }
        const ok = await this.verifyHash(credential.hash, secret);
        if (ok && argon2.needsRehash(credential.hash, ARGON2_OPTIONS)) {
            const hash = await this.hashSecret(secret);
            await this.model
                .updateOne({ _id: credential._id }, { $set: { hash, params: { ...ARGON2_PARAMS }, changedAt: new Date() } })
                .exec();
        }
        return ok;
    }
    async burnVerification(secret) {
        await this.verifyHash(await this.getDummyHash(), secret);
    }
    async mustChange(userId, type) {
        const credential = await this.model
            .findOne({ userId: new Types.ObjectId(userId), type }, { mustChange: 1 })
            .lean()
            .exec();
        return credential?.mustChange ?? false;
    }
    async isPasswordReused(userId, password) {
        const credential = await this.model
            .findOne({ userId: new Types.ObjectId(userId), type: CredentialType.PASSWORD })
            .select('+history')
            .exec();
        if (!credential)
            return false;
        const hashes = [credential.hash, ...credential.history].filter((value) => Boolean(value));
        for (const hash of hashes) {
            if (await this.verifyHash(hash, password))
                return true;
        }
        return false;
    }
    async saveTotpSecret(userId, secretEnc, session) {
        await this.model
            .updateOne({ userId: new Types.ObjectId(userId), type: CredentialType.TOTP }, { $set: { secretEnc, algo: 'aes-256-gcm' }, $unset: { confirmedAt: '' } }, { upsert: true, session })
            .exec();
    }
    async readTotpSecret(userId) {
        const credential = await this.model
            .findOne({ userId: new Types.ObjectId(userId), type: CredentialType.TOTP })
            .select('+secretEnc')
            .exec();
        return credential?.secretEnc ?? null;
    }
    async confirmTotp(userId, session) {
        await this.model
            .updateOne({ userId: new Types.ObjectId(userId), type: CredentialType.TOTP }, { $set: { confirmedAt: new Date() } }, { session })
            .exec();
    }
    async saveRecoveryCodes(userId, codeHashes, session) {
        await this.model
            .updateOne({ userId: new Types.ObjectId(userId), type: CredentialType.RECOVERY_CODES }, { $set: { codeHashes, usedCount: 0 } }, { upsert: true, session })
            .exec();
    }
    async readRecoveryHashes(userId) {
        const credential = await this.model
            .findOne({ userId: new Types.ObjectId(userId), type: CredentialType.RECOVERY_CODES })
            .select('+codeHashes')
            .exec();
        return credential?.codeHashes ?? [];
    }
    async consumeRecoveryHash(userId, hash) {
        await this.model
            .updateOne({ userId: new Types.ObjectId(userId), type: CredentialType.RECOVERY_CODES }, { $pull: { codeHashes: hash }, $inc: { usedCount: 1 } })
            .exec();
    }
    async deleteMfa(userId, session) {
        await this.model
            .deleteMany({
            userId: new Types.ObjectId(userId),
            type: { $in: [CredentialType.TOTP, CredentialType.RECOVERY_CODES] },
        }, { session })
            .exec();
    }
    async clearMustChange(userId, type, session) {
        await this.model
            .updateOne({ userId: new Types.ObjectId(userId), type }, { $set: { mustChange: false } }, { session })
            .exec();
    }
};
CredentialService = __decorate([
    Injectable(),
    __param(0, InjectModel(UserCredential.name)),
    __metadata("design:paramtypes", [Function, ConfigService])
], CredentialService);
export { CredentialService };
//# sourceMappingURL=credential.service.js.map