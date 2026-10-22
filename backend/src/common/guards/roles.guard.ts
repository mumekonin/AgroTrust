import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '../enums/role.enum.js';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-codes.js';
import { IS_PUBLIC, ROLES_KEY, type Principal } from './auth.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const principal = context.switchToHttp().getRequest<{ principal?: Principal }>().principal;
    if (!principal || !required.some((role) => principal.roles.includes(role))) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    return true;
  }
}
