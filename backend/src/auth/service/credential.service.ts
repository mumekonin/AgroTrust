import { createHmac, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { Types } from 'mongoose';
import type { ClientSession, Model } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Env } from '../../config/env.schema.js';
import { CredentialType, UserCredential } from '../schema/user-credential.schema.js';

const ARGON2_PARAMS = { memoryCost: 65_536, timeCost: 3, parallelism: 1 } as const;
export const ARGON2_OPTIONS: argon2.HashOptions = { type: argon2.argon2id, ...ARGON2_PARAMS };

export function pepperSecret(secret: string, pepper: string): string {
  return createHmac('sha256', pepper).update(secret).digest('base64');
}
const PASSWORD_HISTORY_SIZE = 5;

// ---- credential policy (§3.2.2) ----

export interface PolicyContext {
  fullName?: string;
  phone?: string;
  email?: string;
}

const MIN_PASSWORD_LENGTH: Partial<Record<Role, number>> = {
  [Role.LOCAL_ADMIN]: 12,
  [Role.DISTRIBUTOR_STAFF]: 12,
  [Role.REGIONAL_ADMIN]: 14,
  [Role.NATIONAL_ADMIN]: 14,
  [Role.AUDITOR]: 14,
};

const MAX_PASSWORD_LENGTH = 128;

const WEAK_PINS = new Set([
  '000000', '123456', '654321', '112233', '159753', '696969', '123321', '111222', '121212',
]);

const COMMON_PASSWORDS = new Set([
  'passwordpassword', 'password1234', 'password12345', 'password123456', 'administrator',
  'administrator1', 'administrator12', '111111111111', '123456789012', '1234567890123',
  'qwertyuiopas', 'qwertyuiop12', 'qwertyqwerty', 'abcdefghijkl', 'iloveyou1234',
  'welcome12345', 'letmein12345', 'ethiopia12345', 'ethiopia1234', 'agrotrust1234',
  'agrotrust12345', 'changeme1234', 'changemechangeme', 'adminadminadmin',
]);

const YEAR_START = /^(19[4-9]\d|20[0-2]\d)/;
const YEAR_END = /(19[4-9]\d|20[0-2]\d)$/;

/** Returns an error message, or null when the PIN is acceptable. */
export function checkPin(pin: string, ctx: PolicyContext = {}): string | null {
  if (!/^\d{6}$/.test(pin)) return 'PIN must be exactly 6 digits';
  if (WEAK_PINS.has(pin)) return 'PIN is too easy to guess';
  if (/^(\d)\1{5}$/.test(pin)) return 'PIN is too easy to guess';
  if ('0123456789'.includes(pin) || '9876543210'.includes(pin)) return 'PIN is too easy to guess';
  if (/^(\d\d)\1\1$/.test(pin) || /^(\d{3})\1$/.test(pin)) return 'PIN is too easy to guess';
  if (YEAR_START.test(pin) || YEAR_END.test(pin)) return 'PIN must not look like a year';
  const phoneDigits = ctx.phone?.replace(/\D/g, '') ?? '';
  if (phoneDigits.length >= 6 && phoneDigits.slice(-6) === pin) {
    return 'PIN must not be part of your phone number';
  }
  return null;
}

/** Returns an error message, or null when the password is acceptable. */
export function checkPassword(password: string, role: Role, ctx: PolicyContext = {}): string | null {
  const minLength = MIN_PASSWORD_LENGTH[role];
  if (minLength === undefined) return 'This role signs in with a PIN, not a password';
  if (password.length < minLength) return `Password must be at least ${minLength} characters`;
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  }

  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return 'Password is too common';
  if (/^(.)\1+$/.test(password)) return 'Password is too easy to guess';

  const nameParts = (ctx.fullName ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter((part) => part.length >= 4);
  if (nameParts.some((part) => lower.includes(part))) return 'Password must not contain your name';

  const phoneDigits = ctx.phone?.replace(/\D/g, '') ?? '';
  if (phoneDigits.length >= 7 && lower.includes(phoneDigits.slice(-7))) {
    return 'Password must not contain your phone number';
  }

  const emailLocal = ctx.email?.split('@')[0]?.toLowerCase() ?? '';
  if (emailLocal.length >= 4 && lower.includes(emailLocal)) {
    return 'Password must not contain your email name';
  }
  return null;
}

/** Limits how many Argon2 hashes run at once, so a login flood cannot starve the API (§3.12). */
class Semaphore {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  release(): void {
    const next = this.waiting.shift();
    if (next) next();
    else this.active--;
  }
}

@Injectable()
export class CredentialService {
  private readonly pepper: string;
  private readonly gate: Semaphore;
  private dummyHash?: Promise<string>;

  constructor(
    @InjectModel(UserCredential.name) private readonly model: Model<UserCredential>,
    config: ConfigService<Env, true>,
  ) {
    this.pepper = config.get('AUTH_PEPPER', { infer: true });
    this.gate = new Semaphore(config.get('ARGON2_MAX_CONCURRENCY', { infer: true }));
  }

  // ---- policy ----

  assertValidPin(pin: string, ctx: PolicyContext = {}): void {
    const problem = checkPin(pin, ctx);
    if (problem) throw new AppException(ErrorCode.VALIDATION_FAILED, problem);
  }

  assertValidPassword(password: string, role: Role, ctx: PolicyContext = {}): void {
    const problem = checkPassword(password, role, ctx);
    if (problem) throw new AppException(ErrorCode.VALIDATION_FAILED, problem);
  }

  // ---- hashing ----

  /** HMAC with the server-side pepper first, then Argon2id (§3.2.2). */
  private peppered(secret: string): string {
    return pepperSecret(secret, this.pepper);
  }

  async hashSecret(secret: string): Promise<string> {
    await this.gate.acquire();
    try {
      return await argon2.hash(this.peppered(secret), { ...ARGON2_OPTIONS, raw: false });
    } finally {
      this.gate.release();
    }
  }

  private async verifyHash(hash: string, secret: string): Promise<boolean> {
    await this.gate.acquire();
    try {
      return await argon2.verify(hash, this.peppered(secret));
    } catch {
      return false;
    } finally {
      this.gate.release();
    }
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hashSecret(randomBytes(16).toString('hex'));
    return this.dummyHash;
  }

  // ---- storage ----

  async hasCredential(userId: string, type: CredentialType): Promise<boolean> {
    return (await this.model.exists({ userId: new Types.ObjectId(userId), type })) !== null;
  }

  /** Creates or replaces a PIN or password. Passwords keep the last 5 hashes (reuse is blocked). */
  async setSecret(
    userId: string,
    type: typeof CredentialType.PASSWORD | typeof CredentialType.PIN,
    secret: string,
    options: { mustChange?: boolean } = {},
    session?: ClientSession,
  ): Promise<void> {
    const uid = new Types.ObjectId(userId);
    const hash = await this.hashSecret(secret);

    const set: Record<string, unknown> = {
      hash,
      algo: 'argon2id',
      params: { ...ARGON2_PARAMS },
      mustChange: options.mustChange ?? false,
      changedAt: new Date(),
    };

    if (type === CredentialType.PASSWORD) {
      const existing = await this.model
        .findOne({ userId: uid, type })
        .select('+history')
        .session(session ?? null)
        .exec();
      set['history'] = [existing?.hash, ...(existing?.history ?? [])]
        .filter((value): value is string => Boolean(value))
        .slice(0, PASSWORD_HISTORY_SIZE);
    }

    await this.model
      .updateOne({ userId: uid, type }, { $set: set }, { upsert: true, session })
      .exec();
  }

  /**
   * Checks a PIN or password. Always spends the same hashing time, also for unknown users,
   * so response timing does not reveal whether an account exists (§3.6).
   */
  async verifySecret(
    userId: string,
    type: typeof CredentialType.PASSWORD | typeof CredentialType.PIN,
    secret: string,
  ): Promise<boolean> {
    const credential = await this.model
      .findOne({ userId: new Types.ObjectId(userId), type })
      .exec();

    if (!credential?.hash) {
      await this.verifyHash(await this.getDummyHash(), secret);
      return false;
    }

    const ok = await this.verifyHash(credential.hash, secret);
    if (ok && argon2.needsRehash(credential.hash, ARGON2_OPTIONS)) {
      const hash = await this.hashSecret(secret);
      await this.model
        .updateOne(
          { _id: credential._id },
          { $set: { hash, params: { ...ARGON2_PARAMS }, changedAt: new Date() } },
        )
        .exec();
    }
    return ok;
  }

  /** Used when the unknown-user path needs the same cost without a user id. */
  async burnVerification(secret: string): Promise<void> {
    await this.verifyHash(await this.getDummyHash(), secret);
  }

  async mustChange(userId: string, type: CredentialType): Promise<boolean> {
    const credential = await this.model
      .findOne({ userId: new Types.ObjectId(userId), type }, { mustChange: 1 })
      .lean()
      .exec();
    return credential?.mustChange ?? false;
  }

  /** True if the password equals the current one or one of the last 5. */
  async isPasswordReused(userId: string, password: string): Promise<boolean> {
    const credential = await this.model
      .findOne({ userId: new Types.ObjectId(userId), type: CredentialType.PASSWORD })
      .select('+history')
      .exec();
    if (!credential) return false;

    const hashes = [credential.hash, ...credential.history].filter(
      (value): value is string => Boolean(value),
    );
    for (const hash of hashes) {
      if (await this.verifyHash(hash, password)) return true;
    }
    return false;
  }

  async saveTotpSecret(userId: string, secretEnc: string, session?: ClientSession): Promise<void> {
    await this.model
      .updateOne(
        { userId: new Types.ObjectId(userId), type: CredentialType.TOTP },
        { $set: { secretEnc, algo: 'aes-256-gcm' }, $unset: { confirmedAt: '' } },
        { upsert: true, session },
      )
      .exec();
  }

  async readTotpSecret(userId: string): Promise<string | null> {
    const credential = await this.model
      .findOne({ userId: new Types.ObjectId(userId), type: CredentialType.TOTP })
      .select('+secretEnc')
      .exec();
    return credential?.secretEnc ?? null;
  }

  async confirmTotp(userId: string, session?: ClientSession): Promise<void> {
    await this.model
      .updateOne(
        { userId: new Types.ObjectId(userId), type: CredentialType.TOTP },
        { $set: { confirmedAt: new Date() } },
        { session },
      )
      .exec();
  }

  async saveRecoveryCodes(
    userId: string,
    codeHashes: string[],
    session?: ClientSession,
  ): Promise<void> {
    await this.model
      .updateOne(
        { userId: new Types.ObjectId(userId), type: CredentialType.RECOVERY_CODES },
        { $set: { codeHashes, usedCount: 0 } },
        { upsert: true, session },
      )
      .exec();
  }

  async readRecoveryHashes(userId: string): Promise<string[]> {
    const credential = await this.model
      .findOne({ userId: new Types.ObjectId(userId), type: CredentialType.RECOVERY_CODES })
      .select('+codeHashes')
      .exec();
    return credential?.codeHashes ?? [];
  }

  async consumeRecoveryHash(userId: string, hash: string): Promise<void> {
    await this.model
      .updateOne(
        { userId: new Types.ObjectId(userId), type: CredentialType.RECOVERY_CODES },
        { $pull: { codeHashes: hash }, $inc: { usedCount: 1 } },
      )
      .exec();
  }

  async deleteMfa(userId: string, session?: ClientSession): Promise<void> {
    await this.model
      .deleteMany(
        {
          userId: new Types.ObjectId(userId),
          type: { $in: [CredentialType.TOTP, CredentialType.RECOVERY_CODES] },
        },
        { session },
      )
      .exec();
  }

  async clearMustChange(userId: string, type: CredentialType, session?: ClientSession): Promise<void> {
    await this.model
      .updateOne(
        { userId: new Types.ObjectId(userId), type },
        { $set: { mustChange: false } },
        { session },
      )
      .exec();
  }
}