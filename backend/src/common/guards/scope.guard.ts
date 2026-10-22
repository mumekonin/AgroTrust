import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum.js';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-codes.js';
import { IS_PUBLIC, SCOPED_KEY, type Principal, type ScopeKind } from './auth.decorator.js';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const kind = this.reflector.getAllAndOverride<ScopeKind>(SCOPED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!kind) return true;

    const request = context.switchToHttp().getRequest<{
      principal?: Principal;
      params?: Record<string, string>;
      body?: Record<string, string>;
    }>();
    const principal = request.principal;
    if (!principal) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    if (principal.roles.includes(Role.NATIONAL_ADMIN)) return true;

    const resourceId = request.params?.[paramName(kind)] ?? request.body?.[paramName(kind)];
    if (!resourceId) return true;
    if (!scopeContains(principal, kind, resourceId)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    return true;
  }
}

function paramName(kind: ScopeKind): string {
  if (kind === 'localCenter') return 'localCenterId';
  if (kind === 'region') return 'regionId';
  if (kind === 'woreda') return 'woredaId';
  return 'distributorId';
}

export function scopeContains(principal: Principal, kind: ScopeKind, id: string): boolean {
  if (kind === 'localCenter') return principal.scope.localCenterIds.includes(id);
  if (kind === 'region') return principal.scope.regionIds.includes(id);
  if (kind === 'woreda') return principal.scope.woredaIds.includes(id);
  return principal.scope.distributorId === id;
}
