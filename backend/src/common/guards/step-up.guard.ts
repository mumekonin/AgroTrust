import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-codes.js';
import { IS_PUBLIC, STEP_UP_KEY, type Principal } from './auth.decorator.js';

@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<boolean>(STEP_UP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const principal = context.switchToHttp().getRequest<{ principal?: Principal }>().principal;
    if (!principal?.stepUpUntil || principal.stepUpUntil.getTime() <= Date.now()) {
      throw new AppException(ErrorCode.STEP_UP_REQUIRED, 'Confirm your identity to continue', 403);
    }
    return true;
  }
}
