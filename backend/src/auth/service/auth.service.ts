import { createHmac } from 'node:crypto';
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
import type { MfaRequiredResponse } from '../response/auth.response.js';
import { CredentialType } from '../schema/user-credential.schema.js';
import { CredentialService } from './credential.service.js';
import {
  failureIsLockout,
  LockoutService,
  shouldLockAccount,
} from './lockout.service.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';

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

export type LoginResult = IssuedLogin | MfaRequiredResponse;

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

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.UNAUTHENTICATED,
        parsed.mode === 'pin' ? PIN_ERROR : PASSWORD_ERROR,
        401,
      );
    }

    // Staff never get a session from the password alone (§3.5.3). MFA is the next module.
    if (parsed.mode === 'password') {
      const mfa: MfaRequiredResponse = {
        mfaRequired: true,
        mfaMethods: ['totp'],
      };
      return mfa;
    }

    // Trusted-device success path (§3.5.2). New-device OTP is the next module.
    await this.lockout.recordSuccess({ identifierHash, ip, userId: user.id });
    const issued = await this.sessions.create({
      userId: user.id,
      roles: user.roles,
      deviceId: parsed.deviceId,
      deviceLabel: input.deviceLabel?.trim(),
      userAgent: input.userAgent?.slice(0, 256),
      ip,
      authMethod: 'pin',
    });
    const access = await this.tokens.issueAccessToken({
      userId: user.id,
      sid: issued.sid,
      roleVersion: user.roleVersion,
      role: issued.role,
    });
    await this.users.markLogin(user.id);

    return {
      accessToken: access.accessToken,
      expiresIn: access.expiresIn,
      refreshToken: issued.refreshToken,
      refreshExpiresAt: issued.refreshExpiresAt,
      csrfToken: generateCsrfToken(),
    };
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

  async logout(accessToken: string): Promise<void> {
    const claims = await this.tokens.verifyAccessToken(accessToken);
    await this.sessions.revokeSession(claims.sid, 'LOGOUT');
  }

  async logoutAll(accessToken: string): Promise<void> {
    const claims = await this.tokens.verifyAccessToken(accessToken);
    await this.sessions.revokeAllForUser(claims.sub, 'LOGOUT_ALL');
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
