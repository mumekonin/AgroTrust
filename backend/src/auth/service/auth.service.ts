import { createHmac, randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { normalizeEthiopianPhone } from '../../common/utils/phone.util.js';
import type { Env } from '../../config/env.schema.js';
import { UserStatus } from '../../users/schema/user.schema.js';
import { UsersService } from '../../users/service/users.service.js';
import { generateCsrfToken } from '../auth.cookies.js';
import type { MfaRequiredResponse, OtpRequiredResponse } from '../response/auth.response.js';
import { CredentialType } from '../schema/user-credential.schema.js';
import { OtpPurpose } from '../schema/otp-challenge.schema.js';
import { CredentialService } from './credential.service.js';
import { DeviceService } from './device.service.js';
import {
  failureIsLockout,
  LockoutService,
  shouldLockAccount,
} from './lockout.service.js';
import { OtpService } from './otp.service.js';
import { SessionService } from './session.service.js';
import { TokenService, primaryRole } from './token.service.js';
import { TotpService } from './totp.service.js';

const PIN_ERROR = 'Phone or PIN is incorrect';
const PASSWORD_ERROR = 'Identifier or password is incorrect';
const LOCKOUT_MESSAGE = 'Too many attempts. Try again later.';

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

type LoginMode = 'pin' | 'password';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly pepper: string;

  constructor(
    private readonly users: UsersService,
    private readonly credentials: CredentialService,
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
    private readonly lockout: LockoutService,
    private readonly devices: DeviceService,
    private readonly otp: OtpService,
    private readonly totp: TotpService,
    @InjectConnection() private readonly connection: Connection,
    config: ConfigService<Env, true>,
  ) {
    this.pepper = config.get('AUTH_PEPPER', { infer: true });
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const parsed = this.classify(input);
    const identifierHash = this.hashIdentifier(
      this.canonical(parsed.mode, parsed.identifier),
    );
    const ip = input.ip.trim() || 'unknown';

    const user =
      parsed.mode === 'pin'
        ? await this.users.findByPhone(parsed.identifier)
        : await this.users.findByIdentifier(parsed.identifier);

    const gate = await this.lockout.evaluate(identifierHash, ip, user?.status);
    if (gate.ipBlocked) {
      throw new AppException(ErrorCode.TOO_MANY_REQUESTS, LOCKOUT_MESSAGE, 429);
    }

    let credentialOk = false;
    if (user && this.accepts(parsed.mode, user.roles)) {
      credentialOk = await this.credentials.verifySecret(
        user.id,
        parsed.credentialType,
        parsed.secret,
      );
    } else {
      await this.credentials.burnVerification(parsed.secret);
    }

    if (gate.accountBlocked) {
      throw new AppException(ErrorCode.TOO_MANY_REQUESTS, LOCKOUT_MESSAGE, 429);
    }

    if (!credentialOk || !user) {
      const consecutive = await this.lockout.recordFailure({
        identifierHash,
        ip,
        userId: user?.id,
        reason: 'invalid_credentials',
      });
      if (
        user &&
        shouldLockAccount(consecutive) &&
        user.status !== UserStatus.LOCKED
      ) {
        await this.lockAccount(user.id);
      }
      this.logger.warn(`Login failed hash=${identifierHash} ip=${ip}`);
      if (failureIsLockout(consecutive)) {
        throw new AppException(
          ErrorCode.TOO_MANY_REQUESTS,
          LOCKOUT_MESSAGE,
          429,
        );
      }
      throw new AppException(
        ErrorCode.UNAUTHENTICATED,
        parsed.mode === 'pin' ? PIN_ERROR : PASSWORD_ERROR,
        401,
      );
    }

    const pendingStaff =
      parsed.mode === 'password' && user.status === UserStatus.PENDING_ACTIVATION;
    if (user.status !== UserStatus.ACTIVE && !pendingStaff) {
      throw new AppException(
        ErrorCode.UNAUTHENTICATED,
        parsed.mode === 'pin' ? PIN_ERROR : PASSWORD_ERROR,
        401,
      );
    }

    if (parsed.mode === 'password') {
      const challenge = await this.otp.issue({
        userId: user.id,
        phone: user.phone,
        purpose: OtpPurpose.LOGIN_MFA,
        ttlMs: 5 * 60_000,
      });
      const mfaMethods: Array<'totp' | 'sms'> = ['totp'];
      if (user.roles.includes(Role.LOCAL_ADMIN) && user.mfa?.smsFallbackAllowed) {
        mfaMethods.push('sms');
      }
      return {
        mfaRequired: true,
        mfaMethods,
        challengeId: challenge.id,
        totpEnrollRequired: !user.mfa?.totpEnabled,
        passwordChangeRequired: await this.credentials.mustChange(
          user.id,
          CredentialType.PASSWORD,
        ),
      };
    }

    if (!(await this.devices.isTrusted(user.id, parsed.deviceId))) {
      const challenge = await this.otp.issue({
        userId: user.id,
        phone: user.phone,
        purpose: OtpPurpose.LOGIN_NEW_DEVICE,
      });
      return { otpRequired: true, challengeId: challenge.id };
    }

    await this.lockout.recordSuccess({ identifierHash, ip, userId: user.id });
    return this.openSession({
      userId: user.id,
      roles: user.roles,
      roleVersion: user.roleVersion,
      deviceId: parsed.deviceId,
      deviceLabel: input.deviceLabel?.trim(),
      userAgent: input.userAgent?.slice(0, 256),
      ip,
      authMethod: 'pin',
    });
  }

  /** §3.5.6. The caller resolves the cookie or body token and checks CSRF first. */
  async refresh(rawToken: string): Promise<IssuedLogin> {
    const rotated = await this.sessions.rotate(rawToken);
    const user = await this.users.getAuthState(rotated.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.sessions.revokeSession(rotated.sid, 'USER_NOT_ACTIVE');
      throw new AppException(
        ErrorCode.UNAUTHENTICATED,
        'Invalid or expired session',
        401,
      );
    }

    const access = await this.tokens.issueAccessToken({
      userId: rotated.userId,
      sid: rotated.sid,
      roleVersion: user.roleVersion,
      role: rotated.role,
    });
    return {
      accessToken: access.accessToken,
      expiresIn: access.expiresIn,
      refreshToken: rotated.refreshToken,
      refreshExpiresAt: rotated.refreshExpiresAt,
      csrfToken: generateCsrfToken(),
    };
  }

  async logout(sid: string): Promise<void> {
    await this.sessions.revokeSession(sid, 'LOGOUT');
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessions.revokeAllForUser(userId, 'LOGOUT_ALL');
  }

  async verifyLoginOtp(input: {
    challengeId: string;
    code: string;
    deviceId: string;
    deviceLabel?: string;
    ip: string;
    userAgent?: string;
  }): Promise<IssuedLogin> {
    const challenge = await this.otp.verify(input.challengeId, input.code, OtpPurpose.LOGIN_NEW_DEVICE);
    if (!challenge.userId) {
      throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
    }
    const user = await this.users.getByIdOrFail(challenge.userId);
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
    }
    await this.devices.trust(user.id, input.deviceId, input.deviceLabel);
    return this.openSession({
      userId: user.id,
      roles: user.roles,
      roleVersion: user.roleVersion,
      deviceId: input.deviceId,
      deviceLabel: input.deviceLabel,
      userAgent: input.userAgent?.slice(0, 256),
      ip: input.ip,
      authMethod: 'pin+otp',
    });
  }

  async verifyLoginMfa(input: {
    challengeId: string;
    code?: string;
    method?: 'totp' | 'sms' | 'recovery';
    newPassword?: string;
    deviceId: string;
    deviceLabel?: string;
    ip: string;
    userAgent?: string;
  }): Promise<IssuedLogin | OtpRequiredResponse> {
    const pending = await this.otp.peek(input.challengeId, OtpPurpose.LOGIN_MFA);
    if (!pending.userId) {
      throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
    }
    const user = await this.users.getByIdOrFail(pending.userId);
    const method = input.method ?? 'totp';

    if (method === 'sms') {
      if (!user.roles.includes(Role.LOCAL_ADMIN) || !user.mfa?.smsFallbackAllowed) {
        throw new AppException(ErrorCode.FORBIDDEN, 'SMS sign-in is not allowed', 403);
      }
      if (!input.code) {
        const sent = await this.otp.issue({
          userId: user.id,
          phone: user.phone,
          purpose: OtpPurpose.SMS_FALLBACK,
          payloadHash: input.challengeId,
        });
        return { otpRequired: true, challengeId: sent.id };
      }
      await this.otp.verifyLatest({
        userId: user.id,
        purpose: OtpPurpose.SMS_FALLBACK,
        code: input.code,
      });
    } else if (method === 'recovery') {
      if (!input.code) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'A recovery code is required');
      }
      const used = await this.totp.useRecoveryCode(user.id, input.code);
      if (!used) throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
    } else {
      if (!input.code) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'Authenticator code is required');
      }
      const ok = await this.totp.verify(user.id, input.code);
      if (!ok) throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
    }

    if (await this.credentials.mustChange(user.id, CredentialType.PASSWORD)) {
      if (!input.newPassword) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'A new password is required');
      }
      this.credentials.assertValidPassword(input.newPassword, primaryRole(user.roles), {
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
      });
      await this.credentials.setSecret(user.id, CredentialType.PASSWORD, input.newPassword);
      await this.credentials.clearMustChange(user.id, CredentialType.PASSWORD);
    }

    await this.otp.consumeId(input.challengeId);
    if (user.status === UserStatus.PENDING_ACTIVATION) {
      await this.users.activate(user.id);
    }
    return this.openSession({
      userId: user.id,
      roles: user.roles,
      roleVersion: user.roleVersion,
      deviceId: input.deviceId,
      deviceLabel: input.deviceLabel,
      userAgent: input.userAgent?.slice(0, 256),
      ip: input.ip,
      authMethod: method === 'sms' ? 'password+sms' : 'password+totp',
    });
  }

  async stepUp(principal: { userId: string; sid: string; roles: Role[]; ip: string }, input: {
    pin?: string;
    password?: string;
    code?: string;
  }): Promise<void | OtpRequiredResponse> {
    const user = await this.users.getByIdOrFail(principal.userId);
    const farmer = user.roles.every((role) => role === Role.FARMER);
    if (farmer) {
      if (!input.pin) throw new AppException(ErrorCode.VALIDATION_FAILED, 'PIN is required');
      const ok = await this.credentials.verifySecret(user.id, CredentialType.PIN, input.pin);
      if (!ok) throw new AppException(ErrorCode.UNAUTHENTICATED, PIN_ERROR, 401);
      if (!input.code) {
        const sent = await this.otp.issue({
          userId: user.id,
          phone: user.phone,
          purpose: OtpPurpose.STEP_UP,
        });
        return { otpRequired: true, challengeId: sent.id };
      }
      await this.otp.verifyLatest({ userId: user.id, purpose: OtpPurpose.STEP_UP, code: input.code });
    } else {
      if (!input.password || !input.code) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'Password and authenticator code are required');
      }
      const ok = await this.credentials.verifySecret(user.id, CredentialType.PASSWORD, input.password);
      const totpOk = ok && (await this.totp.verify(user.id, input.code));
      if (!totpOk) throw new AppException(ErrorCode.UNAUTHENTICATED, PASSWORD_ERROR, 401);
    }
    const until = new Date(Date.now() + 5 * 60_000);
    await this.sessions.setStepUp(principal.sid, until);
  }

  async openSession(input: {
    userId: string;
    roles: Role[];
    roleVersion: number;
    deviceId: string;
    deviceLabel?: string;
    userAgent?: string;
    ip: string;
    authMethod: string;
  }): Promise<IssuedLogin> {
    const issued = await this.sessions.create({
      userId: input.userId,
      roles: input.roles,
      deviceId: input.deviceId,
      deviceLabel: input.deviceLabel,
      userAgent: input.userAgent,
      ip: input.ip,
      authMethod: input.authMethod,
    });
    const access = await this.tokens.issueAccessToken({
      userId: input.userId,
      sid: issued.sid,
      roleVersion: input.roleVersion,
      role: issued.role,
    });
    await this.users.markLogin(input.userId);
    return {
      accessToken: access.accessToken,
      expiresIn: access.expiresIn,
      refreshToken: issued.refreshToken,
      refreshExpiresAt: issued.refreshExpiresAt,
      csrfToken: generateCsrfToken(),
    };
  }

  async requestPinReset(phone: string): Promise<void> {
    const user = await this.users.findByPhone(phone);
    if (!user || !user.roles.every((role) => role === Role.FARMER) || !user.phone) return;
    await this.otp.issue({ userId: user.id, phone: user.phone, purpose: OtpPurpose.PIN_RESET });
  }

  async confirmPinReset(phone: string, code: string, pin: string): Promise<void> {
    const normalized = normalizeEthiopianPhone(phone);
    const user = normalized ? await this.users.findByPhone(normalized) : null;
    if (!user) throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
    await this.otp.verifyLatest({ phone: user.phone, purpose: OtpPurpose.PIN_RESET, code });
    this.credentials.assertValidPin(pin, { phone: user.phone });
    await this.credentials.setSecret(user.id, CredentialType.PIN, pin);
    await this.sessions.revokeAllForUser(user.id, 'PIN_RESET');
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user || user.roles.every((role) => role === Role.FARMER)) return;
    const token = randomBytes(32).toString('base64url');
    await this.otp.issue({
      userId: user.id,
      purpose: OtpPurpose.PASSWORD_RESET,
      secret: token,
      ttlMs: 30 * 60_000,
    });
  }

  async confirmPasswordReset(token: string, code: string, password: string): Promise<void> {
    const challenge = await this.otp.verifyToken(OtpPurpose.PASSWORD_RESET, token);
    if (!challenge.userId) {
      throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
    }
    const user = await this.users.getByIdOrFail(challenge.userId);
    const totpOk = await this.totp.verify(user.id, code);
    const recoveryOk = totpOk ? false : await this.totp.useRecoveryCode(user.id, code);
    if (!totpOk && !recoveryOk) {
      throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
    }
    this.credentials.assertValidPassword(password, primaryRole(user.roles), {
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
    });
    await this.credentials.setSecret(user.id, CredentialType.PASSWORD, password);
    await this.sessions.revokeAllForUser(user.id, 'PASSWORD_RESET');
  }

  async changePin(userId: string, pin: string): Promise<void> {
    const user = await this.users.getByIdOrFail(userId);
    this.credentials.assertValidPin(pin, { phone: user.phone });
    await this.credentials.setSecret(user.id, CredentialType.PIN, pin);
  }

  async changePassword(userId: string, password: string): Promise<void> {
    const user = await this.users.getByIdOrFail(userId);
    this.credentials.assertValidPassword(password, primaryRole(user.roles), {
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
    });
    if (await this.credentials.isPasswordReused(user.id, password)) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        'Choose a password you have not used before',
      );
    }
    await this.credentials.setSecret(user.id, CredentialType.PASSWORD, password);
    await this.credentials.clearMustChange(user.id, CredentialType.PASSWORD);
  }

  async enrollTotp(input: { userId?: string; challengeId?: string }) {
    const userId = input.userId ?? (await this.userIdFromChallenge(input.challengeId));
    const user = await this.users.getByIdOrFail(userId);
    return this.totp.enroll(user.id, user.email ?? user.phone ?? user.id);
  }

  async confirmTotp(input: {
    userId?: string;
    challengeId?: string;
    code: string;
    deviceId: string;
    deviceLabel?: string;
    ip: string;
    userAgent?: string;
  }): Promise<IssuedLogin & { recoveryCodes: string[] }> {
    const userId = input.userId ?? (await this.userIdFromChallenge(input.challengeId));
    const recoveryCodes = await this.totp.confirm(userId, input.code);
    await this.users.setTotpEnabled(userId, true);
    const user = await this.users.getByIdOrFail(userId);
    if (user.status === UserStatus.PENDING_ACTIVATION) await this.users.activate(userId);
    if (input.challengeId) await this.otp.consumeId(input.challengeId);
    const session = await this.openSession({
      userId,
      roles: user.roles,
      roleVersion: user.roleVersion,
      deviceId: input.deviceId,
      deviceLabel: input.deviceLabel,
      userAgent: input.userAgent?.slice(0, 256),
      ip: input.ip,
      authMethod: 'password+totp',
    });
    return { ...session, recoveryCodes };
  }

  private async userIdFromChallenge(challengeId: string | undefined): Promise<string> {
    if (!challengeId) {
      throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired token', 401);
    }
    for (const purpose of [OtpPurpose.MFA_ENROLL, OtpPurpose.LOGIN_MFA]) {
      try {
        const pending = await this.otp.peek(challengeId, purpose);
        if (pending.userId) return pending.userId;
      } catch (error) {
        if (!(error instanceof AppException)) throw error;
      }
    }
    throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
  }

  private classify(input: LoginInput): {
    mode: LoginMode;
    identifier: string;
    secret: string;
    credentialType: typeof CredentialType.PIN | typeof CredentialType.PASSWORD;
    deviceId: string;
  } {
    const phone = input.phone?.trim();
    const pin = input.pin?.trim();
    const identifier = input.identifier?.trim();
    const password = input.password;
    const deviceId = input.deviceId?.trim();
    const pinSide = Boolean(phone || pin);
    const passwordSide = Boolean(identifier || password);
    if (!deviceId) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        'deviceId is required',
      );
    }
    if (pinSide === passwordSide) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        'Send either a phone and PIN, or an identifier and password',
      );
    }
    if (pinSide) {
      if (!phone || !pin) {
        throw new AppException(
          ErrorCode.VALIDATION_FAILED,
          'Phone and PIN are both required',
        );
      }
      return {
        mode: 'pin',
        identifier: phone,
        secret: pin,
        credentialType: CredentialType.PIN,
        deviceId,
      };
    }
    if (!identifier || !password) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        'Identifier and password are both required',
      );
    }
    return {
      mode: 'password',
      identifier,
      secret: password,
      credentialType: CredentialType.PASSWORD,
      deviceId,
    };
  }

  private accepts(mode: LoginMode, roles: Role[]): boolean {
    const farmerOnly =
      roles.length > 0 && roles.every((role) => role === Role.FARMER);
    const staff = roles.some((role) => role !== Role.FARMER);
    return mode === 'pin' ? farmerOnly : staff;
  }

  private canonical(mode: LoginMode, identifier: string): string {
    if (mode === 'password' && identifier.includes('@'))
      return identifier.toLowerCase();
    return normalizeEthiopianPhone(identifier) ?? `invalid:${identifier}`;
  }

  private hashIdentifier(value: string): string {
    return createHmac('sha256', this.pepper).update(value).digest('hex');
  }

  private async lockAccount(userId: string): Promise<void> {
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        await this.users.setStatus(userId, UserStatus.LOCKED, session);
        await this.sessions.revokeAllForUser(userId, 'ACCOUNT_LOCKED', {
          session,
        });
      });
      this.logger.warn(`Account locked user=${userId}`);
    } finally {
      await session.endSession();
    }
  }
}
