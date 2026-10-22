var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionService } from '../../auth/service/session.service.js';
import { TokenService } from '../../auth/service/token.service.js';
import { UserStatus } from '../../users/schema/user.schema.js';
import { UsersService } from '../../users/service/users.service.js';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-codes.js';
import { IS_PUBLIC } from './auth.decorator.js';
const CACHE_MS = 45_000;
let JwtAuthGuard = class JwtAuthGuard {
    reflector;
    tokens;
    sessions;
    users;
    cache = new Map();
    constructor(reflector, tokens, sessions, users) {
        this.reflector = reflector;
        this.tokens = tokens;
        this.sessions = sessions;
        this.users = users;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const request = context.switchToHttp().getRequest();
        const claims = await this.tokens.verifyAccessToken(bearer(request.headers.authorization));
        const session = await this.sessions.findActive(claims.sid);
        if (!session) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired token', 401);
        }
        const user = await this.userState(claims.sub, claims.rv);
        if (!user || user.status !== UserStatus.ACTIVE || user.roleVersion !== claims.rv) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired token', 401);
        }
        request.principal = {
            userId: claims.sub,
            sid: claims.sid,
            role: claims.role,
            roles: user.roles,
            scope: user.scope,
            stepUpUntil: session.stepUpUntil,
            ip: request.ip ?? 'unknown',
            requestId: request.id ?? '',
        };
        return true;
    }
    async userState(userId, roleVersion) {
        const key = `${userId}:${roleVersion}`;
        const hit = this.cache.get(key);
        if (hit && hit.expires > Date.now())
            return hit;
        const state = await this.users.getAuthState(userId);
        if (!state)
            return null;
        const scope = state.scope;
        const cached = {
            expires: Date.now() + CACHE_MS,
            status: state.status,
            roles: state.roles,
            roleVersion: state.roleVersion,
            scope: {
                regionIds: (scope?.regionIds ?? []).map(String),
                woredaIds: (scope?.woredaIds ?? []).map(String),
                localCenterIds: (scope?.localCenterIds ?? []).map(String),
                distributorId: scope?.distributorId ? String(scope.distributorId) : undefined,
            },
        };
        this.cache.set(key, cached);
        return cached;
    }
};
JwtAuthGuard = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Reflector,
        TokenService,
        SessionService,
        UsersService])
], JwtAuthGuard);
export { JwtAuthGuard };
function bearer(header) {
    if (!header?.startsWith('Bearer ')) {
        throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired token', 401);
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
        throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired token', 401);
    }
    return token;
}
//# sourceMappingURL=jwt-auth.guard.js.map