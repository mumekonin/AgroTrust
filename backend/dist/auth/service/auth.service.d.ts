import { ConfigService } from '@nestjs/config';
import type { Connection } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import type { Env } from '../../config/env.schema.js';
import { UsersService } from '../../users/service/users.service.js';
import type { MfaRequiredResponse, OtpRequiredResponse } from '../response/auth.response.js';
import { CredentialService } from './credential.service.js';
import { DeviceService } from './device.service.js';
import { LockoutService } from './lockout.service.js';
import { OtpService } from './otp.service.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';
import { TotpService } from './totp.service.js';
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
export type LoginResult = IssuedLogin | MfaRequiredResponse | OtpRequiredResponse;
export declare class AuthService {
    private readonly users;
    private readonly credentials;
    private readonly sessions;
    private readonly tokens;
    private readonly lockout;
    private readonly devices;
    private readonly otp;
    private readonly totp;
    private readonly connection;
    private readonly logger;
    private readonly pepper;
    constructor(users: UsersService, credentials: CredentialService, sessions: SessionService, tokens: TokenService, lockout: LockoutService, devices: DeviceService, otp: OtpService, totp: TotpService, connection: Connection, config: ConfigService<Env, true>);
    login(input: LoginInput): Promise<LoginResult>;
    refresh(rawToken: string): Promise<IssuedLogin>;
    logout(sid: string): Promise<void>;
    logoutAll(userId: string): Promise<void>;
    verifyLoginOtp(input: {
        challengeId: string;
        code: string;
        deviceId: string;
        deviceLabel?: string;
        ip: string;
        userAgent?: string;
    }): Promise<IssuedLogin>;
    verifyLoginMfa(input: {
        challengeId: string;
        code?: string;
        method?: 'totp' | 'sms' | 'recovery';
        newPassword?: string;
        deviceId: string;
        deviceLabel?: string;
        ip: string;
        userAgent?: string;
    }): Promise<IssuedLogin | OtpRequiredResponse>;
    stepUp(principal: {
        userId: string;
        sid: string;
        roles: Role[];
        ip: string;
    }, input: {
        pin?: string;
        password?: string;
        code?: string;
    }): Promise<void | OtpRequiredResponse>;
    openSession(input: {
        userId: string;
        roles: Role[];
        roleVersion: number;
        deviceId: string;
        deviceLabel?: string;
        userAgent?: string;
        ip: string;
        authMethod: string;
    }): Promise<IssuedLogin>;
    requestPinReset(phone: string): Promise<void>;
    confirmPinReset(phone: string, code: string, pin: string): Promise<void>;
    requestPasswordReset(email: string): Promise<void>;
    confirmPasswordReset(token: string, code: string, password: string): Promise<void>;
    changePin(userId: string, pin: string): Promise<void>;
    changePassword(userId: string, password: string): Promise<void>;
    enrollTotp(input: {
        userId?: string;
        challengeId?: string;
    }): Promise<{
        otpauthUri: string;
        qrDataUrl: string;
    }>;
    confirmTotp(input: {
        userId?: string;
        challengeId?: string;
        code: string;
        deviceId: string;
        deviceLabel?: string;
        ip: string;
        userAgent?: string;
    }): Promise<IssuedLogin & {
        recoveryCodes: string[];
    }>;
    private userIdFromChallenge;
    private classify;
    private accepts;
    private canonical;
    private hashIdentifier;
    private lockAccount;
}
