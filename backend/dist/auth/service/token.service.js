var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, importPKCS8, importSPKI, jwtVerify } from 'jose';
import { ALL_ROLES, Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
const MIN = 60;
const HOUR = 3600;
const DAY = 86_400;
export const SESSION_POLICY = {
    [Role.FARMER]: { accessTtlSeconds: 15 * MIN, idleSeconds: 30 * DAY, absoluteSeconds: 90 * DAY },
    [Role.LOCAL_ADMIN]: { accessTtlSeconds: 10 * MIN, idleSeconds: 30 * MIN, absoluteSeconds: 8 * HOUR },
    [Role.DISTRIBUTOR_STAFF]: { accessTtlSeconds: 10 * MIN, idleSeconds: 30 * MIN, absoluteSeconds: 8 * HOUR },
    [Role.REGIONAL_ADMIN]: { accessTtlSeconds: 10 * MIN, idleSeconds: 15 * MIN, absoluteSeconds: 8 * HOUR },
    [Role.NATIONAL_ADMIN]: { accessTtlSeconds: 10 * MIN, idleSeconds: 15 * MIN, absoluteSeconds: 8 * HOUR },
    [Role.AUDITOR]: { accessTtlSeconds: 10 * MIN, idleSeconds: 15 * MIN, absoluteSeconds: 8 * HOUR },
};
const ROLE_PRIORITY = [
    Role.NATIONAL_ADMIN,
    Role.REGIONAL_ADMIN,
    Role.AUDITOR,
    Role.LOCAL_ADMIN,
    Role.DISTRIBUTOR_STAFF,
    Role.FARMER,
];
export function primaryRole(roles) {
    const found = ROLE_PRIORITY.find((role) => roles.includes(role));
    if (!found)
        throw new Error('User has no valid role');
    return found;
}
const decodePem = (base64) => Buffer.from(base64, 'base64').toString('utf8');
let TokenService = class TokenService {
    config;
    signingKey;
    keyId;
    verifyKeys = new Map();
    constructor(config) {
        this.config = config;
    }
    async onModuleInit() {
        this.keyId = this.config.get('JWT_KEY_ID', { infer: true });
        this.signingKey = await importPKCS8(decodePem(this.config.get('JWT_PRIVATE_KEY', { infer: true })), 'EdDSA');
        this.verifyKeys.set(this.keyId, await importSPKI(decodePem(this.config.get('JWT_PUBLIC_KEY', { infer: true })), 'EdDSA'));
        const previousKey = this.config.get('JWT_PREVIOUS_PUBLIC_KEY', { infer: true });
        const previousKeyId = this.config.get('JWT_PREVIOUS_KEY_ID', { infer: true });
        if (previousKey && previousKeyId) {
            this.verifyKeys.set(previousKeyId, await importSPKI(decodePem(previousKey), 'EdDSA'));
        }
    }
    async issueAccessToken(input) {
        const expiresIn = SESSION_POLICY[input.role].accessTtlSeconds;
        const now = Math.floor(Date.now() / 1000);
        const accessToken = await new SignJWT({ sid: input.sid, rv: input.roleVersion, role: input.role })
            .setProtectedHeader({ alg: 'EdDSA', kid: this.keyId })
            .setIssuer(this.config.get('JWT_ISSUER', { infer: true }))
            .setAudience(this.config.get('JWT_AUDIENCE', { infer: true }))
            .setSubject(input.userId)
            .setIssuedAt(now)
            .setExpirationTime(now + expiresIn)
            .setJti(randomUUID())
            .sign(this.signingKey);
        return { accessToken, expiresIn };
    }
    async verifyAccessToken(token) {
        try {
            const { payload } = await jwtVerify(token, async (header) => {
                const key = header.kid ? this.verifyKeys.get(header.kid) : undefined;
                if (!key)
                    throw new Error('Unknown key id');
                return key;
            }, {
                algorithms: ['EdDSA'],
                issuer: this.config.get('JWT_ISSUER', { infer: true }),
                audience: this.config.get('JWT_AUDIENCE', { infer: true }),
            });
            const { sub, sid, rv, role, jti, iat, exp } = payload;
            if (typeof sub !== 'string' ||
                typeof sid !== 'string' ||
                typeof rv !== 'number' ||
                typeof role !== 'string' ||
                !ALL_ROLES.includes(role) ||
                typeof jti !== 'string' ||
                typeof iat !== 'number' ||
                typeof exp !== 'number') {
                throw new Error('Malformed claims');
            }
            return { sub, sid, rv, role: role, jti, iat, exp };
        }
        catch {
            throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired token', 401);
        }
    }
    generateRefreshToken() {
        const token = randomBytes(32).toString('base64url');
        return { token, hash: this.hashRefreshToken(token) };
    }
    hashRefreshToken(token) {
        return createHash('sha256').update(token).digest('hex');
    }
};
TokenService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], TokenService);
export { TokenService };
//# sourceMappingURL=token.service.js.map