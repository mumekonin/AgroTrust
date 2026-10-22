import { Types } from 'mongoose';
import type { ClientSession, Model } from 'mongoose';
import type { Role } from '../../common/enums/role.enum.js';
import { AuthSession } from '../schema/auth-session.schema.js';
import { RefreshToken } from '../schema/refresh-token.schema.js';
import { TokenService } from './token.service.js';
export interface CreateSessionInput {
    userId: string;
    roles: Role[];
    deviceId: string;
    deviceLabel?: string;
    userAgent?: string;
    ip?: string;
    authMethod: string;
}
export interface IssuedSession {
    sid: string;
    role: Role;
    refreshToken: string;
    refreshExpiresAt: Date;
    absoluteExpiresAt: Date;
}
export interface RotatedSession {
    sid: string;
    userId: string;
    role: Role;
    refreshToken: string;
    refreshExpiresAt: Date;
}
export declare class SessionService {
    private readonly sessionModel;
    private readonly refreshModel;
    private readonly tokens;
    private readonly logger;
    constructor(sessionModel: Model<AuthSession>, refreshModel: Model<RefreshToken>, tokens: TokenService);
    create(input: CreateSessionInput): Promise<IssuedSession>;
    rotate(rawToken: string): Promise<RotatedSession>;
    findActive(sid: string): Promise<(AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    listActiveForUser(userId: string): Promise<(AuthSession & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    revokeSession(sid: string, reason: string): Promise<void>;
    revokeAllForUser(userId: string, reason: string, options?: {
        exceptSid?: string;
        session?: ClientSession;
    }): Promise<number>;
    setStepUp(sid: string, until: Date): Promise<void>;
    private revokeFamily;
    private refreshExpiry;
}
