import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Model } from 'mongoose';
import type { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { AuthSession } from '../schema/auth-session.schema.js';
import { RefreshToken } from '../schema/refresh-token.schema.js';
import { SESSION_POLICY, TokenService, primaryRole } from './token.service.js';

export interface CreateSessionInput {
  userId: string;
  roles: Role[];
  deviceId: string;
  deviceLabel?: string;
  userAgent?: string;
  ip?: string;
  /** e.g. 'pin', 'password+totp', 'password+sms', 'activation', 'invitation' */
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

const invalidSession = () =>
  new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired session', 401);

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectModel(AuthSession.name) private readonly sessionModel: Model<AuthSession>,
    @InjectModel(RefreshToken.name) private readonly refreshModel: Model<RefreshToken>,
    private readonly tokens: TokenService,
  ) {}

  /** Opens a session and its first refresh token. */
  async create(input: CreateSessionInput): Promise<IssuedSession> {
    const role = primaryRole(input.roles);
    const policy = SESSION_POLICY[role];
    const now = new Date();
    const absoluteExpiresAt = new Date(now.getTime() + policy.absoluteSeconds * 1000);
    const sid = randomUUID();
    const family = randomUUID();

    await this.sessionModel.create({
      sid,
      userId: new Types.ObjectId(input.userId),
      role,
      family,
      deviceId: input.deviceId,
      deviceLabel: input.deviceLabel,
      userAgent: input.userAgent,
      ip: input.ip,
      lastSeenAt: now,
      absoluteExpiresAt,
      authMethod: input.authMethod,
    });

    const refresh = this.tokens.generateRefreshToken();
    const refreshExpiresAt = this.refreshExpiry(now, policy.idleSeconds, absoluteExpiresAt);
    await this.refreshModel.create({
      sid,
      family,
      tokenHash: refresh.hash,
      expiresAt: refreshExpiresAt,
    });

    return { sid, role, refreshToken: refresh.token, refreshExpiresAt, absoluteExpiresAt };
  }

  /**
   * Rotates a refresh token. Each token works once. Presenting an already-used token
   * revokes the whole family (§3.3.2).
   */
  async rotate(rawToken: string): Promise<RotatedSession> {
    const tokenHash = this.tokens.hashRefreshToken(rawToken);
    const now = new Date();

    // Atomic claim: only one caller can mark a token as used.
    const claimed = await this.refreshModel
      .findOneAndUpdate(
        { tokenHash, usedAt: { $exists: false }, expiresAt: { $gt: now } },
        { $set: { usedAt: now } },
        { new: true },
      )
      .exec();

    if (!claimed) {
      const existing = await this.refreshModel.findOne({ tokenHash }).exec();
      if (existing?.usedAt) {
        await this.revokeFamily(existing.family, existing.sid, 'REFRESH_REUSE_DETECTED');
        // TODO (audit module): also write a REFRESH_REUSE_DETECTED security event.
        this.logger.warn(`Refresh token reuse detected for session ${existing.sid}`);
      }
      throw invalidSession();
    }

    const session = await this.sessionModel.findOne({ sid: claimed.sid }).exec();
    if (!session || session.revokedAt || session.absoluteExpiresAt <= now) {
      throw invalidSession();
    }

    const role = session.role as Role;
    const next = this.tokens.generateRefreshToken();
    const refreshExpiresAt = this.refreshExpiry(
      now,
      SESSION_POLICY[role].idleSeconds,
      session.absoluteExpiresAt,
    );

    const created = await this.refreshModel.create({
      sid: session.sid,
      family: claimed.family,
      tokenHash: next.hash,
      expiresAt: refreshExpiresAt,
    });
    await this.refreshModel
      .updateOne({ _id: claimed._id }, { $set: { replacedBy: created._id } })
      .exec();
    await this.sessionModel.updateOne({ sid: session.sid }, { $set: { lastSeenAt: now } }).exec();

    return {
      sid: session.sid,
      userId: String(session.userId),
      role,
      refreshToken: next.token,
      refreshExpiresAt,
    };
  }

  /** Active = not revoked and inside the absolute lifetime. Used by the JWT guard (Part 3B). */
  findActive(sid: string) {
    return this.sessionModel
      .findOne({ sid, revokedAt: { $exists: false }, absoluteExpiresAt: { $gt: new Date() } })
      .lean()
      .exec();
  }

  listActiveForUser(userId: string) {
    return this.sessionModel
      .find({
        userId: new Types.ObjectId(userId),
        revokedAt: { $exists: false },
        absoluteExpiresAt: { $gt: new Date() },
      })
      .sort({ lastSeenAt: -1 })
      .lean()
      .exec();
  }

  /** Revokes one session and its refresh tokens. */
  async revokeSession(sid: string, reason: string): Promise<void> {
    const session = await this.sessionModel.findOne({ sid }).exec();
    if (!session) return;
    await this.revokeFamily(session.family, sid, reason);
  }

  /**
   * Revokes all of a user's active sessions (logout-all, suspension, role change).
   * Pass the transaction session when this must commit together with a status change.
   */
  async revokeAllForUser(
    userId: string,
    reason: string,
    options: { exceptSid?: string; session?: ClientSession } = {},
  ): Promise<number> {
    const now = new Date();
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      revokedAt: { $exists: false },
    };
    if (options.exceptSid) filter['sid'] = { $ne: options.exceptSid };

    const sessions = await this.sessionModel
      .find(filter, { sid: 1 })
      .session(options.session ?? null)
      .lean()
      .exec();
    if (sessions.length === 0) return 0;

    const sids = sessions.map((s) => s.sid);
    await this.sessionModel
      .updateMany(
        { sid: { $in: sids } },
        { $set: { revokedAt: now, revokedReason: reason } },
        { session: options.session },
      )
      .exec();
    await this.refreshModel
      .updateMany(
        { sid: { $in: sids }, usedAt: { $exists: false } },
        { $set: { usedAt: now } },
        { session: options.session },
      )
      .exec();
    return sids.length;
  }

  async setStepUp(sid: string, until: Date): Promise<void> {
    await this.sessionModel.updateOne({ sid }, { $set: { stepUpUntil: until } }).exec();
  }

  private async revokeFamily(family: string, sid: string, reason: string): Promise<void> {
    const now = new Date();
    await this.sessionModel
      .updateOne(
        { sid, revokedAt: { $exists: false } },
        { $set: { revokedAt: now, revokedReason: reason } },
      )
      .exec();
    await this.refreshModel
      .updateMany({ family, usedAt: { $exists: false } }, { $set: { usedAt: now } })
      .exec();
  }

  private refreshExpiry(now: Date, idleSeconds: number, absoluteExpiresAt: Date): Date {
    return new Date(Math.min(now.getTime() + idleSeconds * 1000, absoluteExpiresAt.getTime()));
  }
}