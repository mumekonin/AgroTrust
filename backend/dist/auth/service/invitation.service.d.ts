import type { Model } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { UsersService } from '../../users/service/users.service.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { Invitation, InvitationStatus } from '../schema/invitation.schema.js';
import { CredentialService } from './credential.service.js';
import { OtpService } from './otp.service.js';
export declare function inviteDecision(input: {
    actorRoles: Role[];
    actorRegionIds: string[];
    targetRole: Role;
    targetRegionIds: string[];
}): 'ok' | 'needs_approval' | 'forbidden';
export declare class InvitationService {
    private readonly model;
    private readonly users;
    private readonly credentials;
    private readonly otp;
    constructor(model: Model<Invitation>, users: UsersService, credentials: CredentialService, otp: OtpService);
    create(principal: Principal, input: {
        role: Role;
        email?: string;
        phone?: string;
        scope?: {
            regionIds?: string[];
            woredaIds?: string[];
            localCenterIds?: string[];
            distributorId?: string;
        };
    }): Promise<{
        id: string;
        status: InvitationStatus;
        expiresAt: Date;
        token?: string;
    }>;
    approve(principal: Principal, id: string): Promise<{
        token: string;
        expiresAt: Date;
    }>;
    revoke(principal: Principal, id: string): Promise<void>;
    accept(input: {
        token: string;
        code: string;
        password: string;
    }): Promise<{
        challengeId: string;
    }>;
}
