export const Role = {
  FARMER: 'farmer',
  LOCAL_ADMIN: 'local_admin',
  DISTRIBUTOR_STAFF: 'distributor_staff',
  REGIONAL_ADMIN: 'regional_admin',
  NATIONAL_ADMIN: 'national_admin',
  AUDITOR: 'auditor',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ALL_ROLES: Role[] = Object.values(Role);