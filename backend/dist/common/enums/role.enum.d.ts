export declare const Role: {
    readonly FARMER: "farmer";
    readonly LOCAL_ADMIN: "local_admin";
    readonly DISTRIBUTOR_STAFF: "distributor_staff";
    readonly REGIONAL_ADMIN: "regional_admin";
    readonly NATIONAL_ADMIN: "national_admin";
    readonly AUDITOR: "auditor";
};
export type Role = (typeof Role)[keyof typeof Role];
export declare const ALL_ROLES: Role[];
