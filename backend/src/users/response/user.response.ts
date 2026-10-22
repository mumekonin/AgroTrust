import type { UserDocument } from '../schema/user.schema.js';

export interface UserResponse {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  roles: string[];
  status: string;
  preferredLanguage: string;
  scope: {
    regionIds: string[];
    woredaIds: string[];
    localCenterIds: string[];
    distributorId?: string;
  };
  mfa: { totpEnabled: boolean };
  lastLoginAt?: Date;
}

export function toUserResponse(user: UserDocument): UserResponse {
  return {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    roles: user.roles,
    status: user.status,
    preferredLanguage: user.preferredLanguage,
    scope: {
      regionIds: user.scope.regionIds.map(String),
      woredaIds: user.scope.woredaIds.map(String),
      localCenterIds: user.scope.localCenterIds.map(String),
      distributorId: user.scope.distributorId?.toString(),
    },
    mfa: { totpEnabled: user.mfa.totpEnabled },
    lastLoginAt: user.lastLoginAt,
  };
}