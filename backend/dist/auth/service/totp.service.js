var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual, } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { toDataURL } from 'qrcode';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CredentialService } from './credential.service.js';
const ISSUER = 'AgroTrust';
const RECOVERY_CODE_COUNT = 10;
export function encryptTotpSecret(secret, rawKey) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', keyBytes(rawKey), iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}
export function decryptTotpSecret(payload, rawKey) {
    const [iv, tag, encrypted] = payload.split('.');
    if (!iv || !tag || !encrypted) {
        throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
    }
    const decipher = createDecipheriv('aes-256-gcm', keyBytes(rawKey), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64url')),
        decipher.final(),
    ]).toString('utf8');
}
export function hashRecoveryCode(code, pepper) {
    return createHmac('sha256', pepper).update(code).digest('hex');
}
export function recoveryCodeMatches(code, hash, pepper) {
    const left = Buffer.from(hashRecoveryCode(code, pepper));
    const right = Buffer.from(hash);
    if (left.length !== right.length)
        return false;
    return timingSafeEqual(left, right);
}
function keyBytes(rawKey) {
    return createHash('sha256').update(rawKey).digest();
}
let TotpService = class TotpService {
    credentials;
    key;
    pepper;
    constructor(credentials, config) {
        this.credentials = credentials;
        this.key = config.get('TOTP_ENCRYPTION_KEY', { infer: true });
        this.pepper = config.get('AUTH_PEPPER', { infer: true });
    }
    async enroll(userId, label) {
        const secret = generateSecret();
        await this.credentials.saveTotpSecret(userId, encryptTotpSecret(secret, this.key));
        const otpauthUri = generateURI({ issuer: ISSUER, label, secret });
        const qrDataUrl = await toDataURL(otpauthUri);
        return { otpauthUri, qrDataUrl };
    }
    async confirm(userId, code) {
        const ok = await this.verify(userId, code);
        if (!ok)
            throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
        await this.credentials.confirmTotp(userId);
        return this.replaceRecoveryCodes(userId);
    }
    async verify(userId, code) {
        const stored = await this.credentials.readTotpSecret(userId);
        if (!stored)
            return false;
        const secret = decryptTotpSecret(stored, this.key);
        const result = verifySync({ secret, token: code, epochTolerance: 30 });
        return result.valid;
    }
    async useRecoveryCode(userId, code) {
        const hashes = await this.credentials.readRecoveryHashes(userId);
        let matched;
        for (const hash of hashes) {
            if (recoveryCodeMatches(code, hash, this.pepper))
                matched = hash;
        }
        if (!matched)
            return false;
        await this.credentials.consumeRecoveryHash(userId, matched);
        return true;
    }
    async replaceRecoveryCodes(userId) {
        const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => randomBytes(5).toString('hex'));
        await this.credentials.saveRecoveryCodes(userId, codes.map((code) => hashRecoveryCode(code, this.pepper)));
        return codes;
    }
};
TotpService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [CredentialService,
        ConfigService])
], TotpService);
export { TotpService };
//# sourceMappingURL=totp.service.js.map