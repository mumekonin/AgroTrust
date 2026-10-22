import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '../enums/role.enum.js';

export const IS_PUBLIC = 'isPublic';
export const ROLES_KEY = 'roles';
export const SCOPED_KEY = 'scoped';
export const STEP_UP_KEY = 'stepUp';

export type ScopeKind = 'localCenter' | 'region' | 'woreda' | 'distributor';

export interface Principal {
  userId: string;
  sid: string;
  role: Role;
  roles: Role[];
  scope: {
    regionIds: string[];
    woredaIds: string[];
    localCenterIds: string[];
    distributorId?: string;
  };
  farmerId?: string;
  stepUpUntil?: Date;
  ip: string;
  requestId: string;
}

export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const Scoped = (kind: ScopeKind) => SetMetadata(SCOPED_KEY, kind);
export const RequireStepUp = () => SetMetadata(STEP_UP_KEY, true);

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal => {
    const request = ctx.switchToHttp().getRequest<{ principal: Principal }>();
    return request.principal;
  },
);
