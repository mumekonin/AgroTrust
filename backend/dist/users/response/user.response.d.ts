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
    mfa: {
        totpEnabled: boolean;
    };
    lastLoginAt?: Date;
}
export declare function toUserResponse(user: UserDocument): UserResponse;
