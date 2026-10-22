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
import { Role } from '../enums/role.enum.js';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-codes.js';
import { IS_PUBLIC, SCOPED_KEY } from './auth.decorator.js';
let ScopeGuard = class ScopeGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const kind = this.reflector.getAllAndOverride(SCOPED_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!kind)
            return true;
        const request = context.switchToHttp().getRequest();
        const principal = request.principal;
        if (!principal) {
            throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
        }
        if (principal.roles.includes(Role.NATIONAL_ADMIN))
            return true;
        const resourceId = request.params?.[paramName(kind)] ?? request.body?.[paramName(kind)];
        if (!resourceId)
            return true;
        if (!scopeContains(principal, kind, resourceId)) {
            throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
        }
        return true;
    }
};
ScopeGuard = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Reflector])
], ScopeGuard);
export { ScopeGuard };
function paramName(kind) {
    if (kind === 'localCenter')
        return 'localCenterId';
    if (kind === 'region')
        return 'regionId';
    if (kind === 'woreda')
        return 'woredaId';
    return 'distributorId';
}
export function scopeContains(principal, kind, id) {
    if (kind === 'localCenter')
        return principal.scope.localCenterIds.includes(id);
    if (kind === 'region')
        return principal.scope.regionIds.includes(id);
    if (kind === 'woreda')
        return principal.scope.woredaIds.includes(id);
    return principal.scope.distributorId === id;
}
//# sourceMappingURL=scope.guard.js.map