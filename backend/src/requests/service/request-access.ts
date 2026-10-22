import { Role } from '../../common/enums/role.enum.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import type { FarmerRecord } from '../../farmers/service/farmers.service.js';

export function canSeeRequest(principal: Principal, farmer: FarmerRecord): boolean {
  if (principal.roles.includes(Role.NATIONAL_ADMIN) || principal.roles.includes(Role.AUDITOR)) return true;
  if (principal.roles.includes(Role.FARMER) && farmer.userId === principal.userId) return true;
  if (
    principal.roles.includes(Role.LOCAL_ADMIN) &&
    principal.scope.localCenterIds.includes(farmer.localCenterId)
  ) {
    return true;
  }
  if (principal.roles.includes(Role.REGIONAL_ADMIN) && principal.scope.regionIds.includes(farmer.regionId)) {
    return true;
  }
  return false;
}

/** §2.9.2. Only a local admin of the farmer's center reviews. */
export function canReviewRequest(principal: Principal, farmer: FarmerRecord): boolean {
  return (
    principal.roles.includes(Role.LOCAL_ADMIN) &&
    principal.scope.localCenterIds.includes(farmer.localCenterId)
  );
}

export function canCancelRequest(principal: Principal, farmer: FarmerRecord): boolean {
  if (principal.roles.includes(Role.NATIONAL_ADMIN)) return true;
  if (principal.roles.includes(Role.FARMER) && farmer.userId === principal.userId) return true;
  if (canReviewRequest(principal, farmer)) return true;
  if (principal.roles.includes(Role.REGIONAL_ADMIN) && principal.scope.regionIds.includes(farmer.regionId)) {
    return true;
  }
  return false;
}
