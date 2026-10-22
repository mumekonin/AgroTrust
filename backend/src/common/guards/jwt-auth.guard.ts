import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionService } from '../../auth/service/session.service.js';
import { TokenService } from '../../auth/service/token.service.js';
import { UserStatus } from '../../users/schema/user.schema.js';
import { UsersService } from '../../users/service/users.service.js';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-codes.js';
import { IS_PUBLIC, type Principal } from './auth.decorator.js';

const CACHE_MS = 45_000;

interface CachedUser {
  expires: number;
  status: UserStatus;
  roles: Principal['roles'];
  roleVersion: number;
  scope: Principal['scope'];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly cache = new Map<string, CachedUser>();

  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      ip?: string;
      id?: string;
      principal?: Principal;
    }>();
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

  private async userState(userId: string, roleVersion: number): Promise<CachedUser | null> {
    const key = `${userId}:${roleVersion}`;
    const hit = this.cache.get(key);
    if (hit && hit.expires > Date.now()) return hit;

    const state = await this.users.getAuthState(userId);
    if (!state) return null;
    const scope = state.scope;
    const cached: CachedUser = {
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
}

function bearer(header: string | undefined): string {
  if (!header?.startsWith('Bearer ')) {
    throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired token', 401);
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired token', 401);
  }
  return token;
}
