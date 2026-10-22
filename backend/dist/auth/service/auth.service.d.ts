import { ConfigService } from '@nestjs/config';
import type { Connection } from 'mongoose';
import type { Env } from '../../config/env.schema.js';
import { UsersService } from '../../users/service/users.service.js';
import type { MfaRequiredResponse } from '../response/auth.response.js';
import { CredentialService } from './credential.service.js';
import { LockoutService } from './lockout.service.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';
export interface LoginInput {
    phone?: string;
    pin?: string;
    identifier?: string;
    password?: string;
    deviceId: string;
    deviceLabel?: string;
    ip: string;
    userAgent?: string;
}
export interface IssuedLogin {
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
    refreshExpiresAt: Date;
    csrfToken: string;
}
export type LoginResult = IssuedLogin | MfaRequiredResponse;
export declare class AuthService {
    private readonly users;
    private readonly credentials;
    private readonly sessions;
    private readonly tokens;
    private readonly lockout;
    private readonly connection;
    private readonly logger;
    private readonly pepper;
    constructor(users: UsersService, credentials: CredentialService, sessions: SessionService, tokens: TokenService, lockout: LockoutService, connection: Connection, config: ConfigService<Env, true>);
    login(input: LoginInput): Promise<LoginResult>;
    refresh(rawToken: string): Promise<IssuedLogin>;
    logout(accessToken: string): Promise<void>;
    logoutAll(accessToken: string): Promise<void>;
    private classify;
    private accepts;
    private canonical;
    private hashIdentifier;
    private lockAccount;
}
