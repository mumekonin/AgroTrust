import type { Role } from '../enums/role.enum.js';
export declare const IS_PUBLIC = "isPublic";
export declare const ROLES_KEY = "roles";
export declare const SCOPED_KEY = "scoped";
export declare const STEP_UP_KEY = "stepUp";
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
export declare const Public: () => import("@nestjs/common").CustomDecorator<string>;
export declare const Roles: (...roles: Role[]) => import("@nestjs/common").CustomDecorator<string>;
export declare const Scoped: (kind: ScopeKind) => import("@nestjs/common").CustomDecorator<string>;
export declare const RequireStepUp: () => import("@nestjs/common").CustomDecorator<string>;
export declare const CurrentPrincipal: (...dataOrPipes: unknown[]) => ParameterDecorator;
