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
var AuthService_1;
import { createHmac } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { normalizeEthiopianPhone } from '../../common/utils/phone.util.js';
import { UserStatus } from '../../users/schema/user.schema.js';
import { UsersService } from '../../users/service/users.service.js';
import { generateCsrfToken } from '../auth.cookies.js';
import { CredentialType } from '../schema/user-credential.schema.js';
import { CredentialService } from './credential.service.js';
import { failureIsLockout, LockoutService, shouldLockAccount, } from './lockout.service.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';
const PIN_ERROR = 'Phone or PIN is incorrect';
const PASSWORD_ERROR = 'Identifier or password is incorrect';
const LOCKOUT_MESSAGE = 'Too many attempts. Try again later.';
let AuthService = AuthService_1 = class AuthService {
    users;
    credentials;
    sessions;
    tokens;
    lockout;
    connection;
    logger = new Logger(AuthService_1.name);
    pepper;
    constructor(users, credentials, sessions, tokens, lockout, connection, config) {
        this.users = users;
        this.credentials = credentials;
        this.sessions = sessions;
        this.tokens = tokens;
        this.lockout = lockout;
        this.connection = connection;
        this.pepper = config.get('AUTH_PEPPER', { infer: true });
    }
    async login(input) {
        const parsed = this.classify(input);
        const identifierHash = this.hashIdentifier(this.canonical(parsed.mode, parsed.identifier));
        const ip = input.ip.trim() || 'unknown';
        const user = parsed.mode === 'pin'
            ? await this.users.findByPhone(parsed.identifier)
            : await this.users.findByIdentifier(parsed.identifier);
        const gate = await this.lockout.evaluate(identifierHash, ip, user?.status);
        if (gate.ipBlocked) {
            throw new AppException(ErrorCode.TOO_MANY_REQUESTS, LOCKOUT_MESSAGE, 429);
        }
        let credentialOk = false;
        if (user && this.accepts(parsed.mode, user.roles)) {
            credentialOk = await this.credentials.verifySecret(user.id, parsed.credentialType, parsed.secret);
        }
        else {
            await this.credentials.burnVerification(parsed.secret);
        }
        if (gate.accountBlocked) {
            throw new AppException(ErrorCode.TOO_MANY_REQUESTS, LOCKOUT_MESSAGE, 429);
        }
        if (!credentialOk || !user) {
            const consecutive = await this.lockout.recordFailure({
                identifierHash,
                ip,
                userId: user?.id,
                reason: 'invalid_credentials',
            });
            if (user &&
                shouldLockAccount(consecutive) &&
                user.status !== UserStatus.LOCKED) {
                await this.lockAccount(user.id);
            }
            this.logger.warn(`Login failed hash=${identifierHash} ip=${ip}`);
            if (failureIsLockout(consecutive)) {
                throw new AppException(ErrorCode.TOO_MANY_REQUESTS, LOCKOUT_MESSAGE, 429);
            }
            throw new AppException(ErrorCode.UNAUTHENTICATED, parsed.mode === 'pin' ? PIN_ERROR : PASSWORD_ERROR, 401);
        }
        if (user.status !== UserStatus.ACTIVE) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, parsed.mode === 'pin' ? PIN_ERROR : PASSWORD_ERROR, 401);
        }
        if (parsed.mode === 'password') {
            const mfa = {
                mfaRequired: true,
                mfaMethods: ['totp'],
            };
            return mfa;
        }
        await this.lockout.recordSuccess({ identifierHash, ip, userId: user.id });
        const issued = await this.sessions.create({
            userId: user.id,
            roles: user.roles,
            deviceId: parsed.deviceId,
            deviceLabel: input.deviceLabel?.trim(),
            userAgent: input.userAgent?.slice(0, 256),
            ip,
            authMethod: 'pin',
        });
        const access = await this.tokens.issueAccessToken({
            userId: user.id,
            sid: issued.sid,
            roleVersion: user.roleVersion,
            role: issued.role,
        });
        await this.users.markLogin(user.id);
        return {
            accessToken: access.accessToken,
            expiresIn: access.expiresIn,
            refreshToken: issued.refreshToken,
            refreshExpiresAt: issued.refreshExpiresAt,
            csrfToken: generateCsrfToken(),
        };
    }
    async refresh(rawToken) {
        const rotated = await this.sessions.rotate(rawToken);
        const user = await this.users.getAuthState(rotated.userId);
        if (!user || user.status !== UserStatus.ACTIVE) {
            await this.sessions.revokeSession(rotated.sid, 'USER_NOT_ACTIVE');
            throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired session', 401);
        }
        const access = await this.tokens.issueAccessToken({
            userId: rotated.userId,
            sid: rotated.sid,
            roleVersion: user.roleVersion,
            role: rotated.role,
        });
        return {
            accessToken: access.accessToken,
            expiresIn: access.expiresIn,
            refreshToken: rotated.refreshToken,
            refreshExpiresAt: rotated.refreshExpiresAt,
            csrfToken: generateCsrfToken(),
        };
    }
    async logout(accessToken) {
        const claims = await this.tokens.verifyAccessToken(accessToken);
        await this.sessions.revokeSession(claims.sid, 'LOGOUT');
    }
    async logoutAll(accessToken) {
        const claims = await this.tokens.verifyAccessToken(accessToken);
        await this.sessions.revokeAllForUser(claims.sub, 'LOGOUT_ALL');
    }
    classify(input) {
        const phone = input.phone?.trim();
        const pin = input.pin?.trim();
        const identifier = input.identifier?.trim();
        const password = input.password;
        const deviceId = input.deviceId?.trim();
        const pinSide = Boolean(phone || pin);
        const passwordSide = Boolean(identifier || password);
        if (!deviceId) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'deviceId is required');
        }
        if (pinSide === passwordSide) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Send either a phone and PIN, or an identifier and password');
        }
        if (pinSide) {
            if (!phone || !pin) {
                throw new AppException(ErrorCode.VALIDATION_FAILED, 'Phone and PIN are both required');
            }
            return {
                mode: 'pin',
                identifier: phone,
                secret: pin,
                credentialType: CredentialType.PIN,
                deviceId,
            };
        }
        if (!identifier || !password) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Identifier and password are both required');
        }
        return {
            mode: 'password',
            identifier,
            secret: password,
            credentialType: CredentialType.PASSWORD,
            deviceId,
        };
    }
    accepts(mode, roles) {
        const farmerOnly = roles.length > 0 && roles.every((role) => role === Role.FARMER);
        const staff = roles.some((role) => role !== Role.FARMER);
        return mode === 'pin' ? farmerOnly : staff;
    }
    canonical(mode, identifier) {
        if (mode === 'password' && identifier.includes('@'))
            return identifier.toLowerCase();
        return normalizeEthiopianPhone(identifier) ?? `invalid:${identifier}`;
    }
    hashIdentifier(value) {
        return createHmac('sha256', this.pepper).update(value).digest('hex');
    }
    async lockAccount(userId) {
        const session = await this.connection.startSession();
        try {
            await session.withTransaction(async () => {
                await this.users.setStatus(userId, UserStatus.LOCKED, session);
                await this.sessions.revokeAllForUser(userId, 'ACCOUNT_LOCKED', {
                    session,
                });
            });
            this.logger.warn(`Account locked user=${userId}`);
        }
        finally {
            await session.endSession();
        }
    }
};
AuthService = AuthService_1 = __decorate([
    Injectable(),
    __param(5, InjectConnection()),
    __metadata("design:paramtypes", [UsersService,
        CredentialService,
        SessionService,
        TokenService,
        LockoutService, Function, ConfigService])
], AuthService);
export { AuthService };
//# sourceMappingURL=auth.service.js.map