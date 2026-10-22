import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import type { UserStatus } from '../../users/schema/user.schema.js';
import { UserStatus as UserStatusValue } from '../../users/schema/user.schema.js';
import { LoginAttempt } from '../schema/login-attempt.schema.js';

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const IP_LIMIT_PER_MINUTE = 20;
const IP_LIMIT_PER_HOUR = 100;
const FAILURES_BEFORE_SHORT_LOCK = 5;
const SHORT_LOCK_MS = 15 * MINUTE_MS;
const FAILURES_BEFORE_LONG_LOCK = 10;
const LONG_LOCK_MS = HOUR_MS;
const FAILURES_BEFORE_ACCOUNT_LOCK = 20;

export interface AttemptStamp {
  success: boolean;
  at: Date;
}

export interface LockoutGate {
  ipBlocked: boolean;
  accountBlocked: boolean;
}

/** Counts failures since the newest success. Attempts must be newest first. */
export function consecutiveFailures(attempts: AttemptStamp[]): {
  count: number;
  lastFailureAt?: Date;
} {
  let count = 0;
  let lastFailureAt: Date | undefined;
  for (const attempt of attempts) {
    if (attempt.success) break;
    count += 1;
    lastFailureAt ??= attempt.at;
  }
  return { count, lastFailureAt };
}

/** The attempt that reaches five consecutive failures is already locked out (§3.6). */
export function failureIsLockout(consecutive: number): boolean {
  return consecutive >= FAILURES_BEFORE_SHORT_LOCK;
}

export function shouldLockAccount(consecutive: number): boolean {
  return consecutive >= FAILURES_BEFORE_ACCOUNT_LOCK;
}

/** §3.6. Five failures lock 15 minutes, ten lock 1 hour, twenty lock the account. */
export function lockoutFromFailures(
  consecutive: number,
  lastFailureAt: Date | undefined,
  now: Date,
  status?: UserStatus,
): 'ok' | 'locked' {
  if (
    status === UserStatusValue.LOCKED ||
    consecutive >= FAILURES_BEFORE_ACCOUNT_LOCK
  ) {
    return 'locked';
  }
  if (!lastFailureAt || consecutive < FAILURES_BEFORE_SHORT_LOCK) return 'ok';

  const elapsed = now.getTime() - lastFailureAt.getTime();
  if (consecutive >= FAILURES_BEFORE_LONG_LOCK && elapsed < LONG_LOCK_MS)
    return 'locked';
  if (consecutive >= FAILURES_BEFORE_SHORT_LOCK && elapsed < SHORT_LOCK_MS)
    return 'locked';
  return 'ok';
}

@Injectable()
export class LockoutService {
  constructor(
    @InjectModel(LoginAttempt.name)
    private readonly attempts: Model<LoginAttempt>,
  ) {}

  async evaluate(
    identifierHash: string,
    ip: string,
    status?: UserStatus,
  ): Promise<LockoutGate> {
    const now = Date.now();
    const [perMinute, perHour, recent] = await Promise.all([
      this.attempts.countDocuments({
        ip,
        at: { $gte: new Date(now - MINUTE_MS) },
      }),
      this.attempts.countDocuments({
        ip,
        at: { $gte: new Date(now - HOUR_MS) },
      }),
      this.recent(identifierHash),
    ]);
    const { count, lastFailureAt } = consecutiveFailures(recent);
    return {
      ipBlocked:
        perMinute >= IP_LIMIT_PER_MINUTE || perHour >= IP_LIMIT_PER_HOUR,
      accountBlocked:
        lockoutFromFailures(count, lastFailureAt, new Date(now), status) ===
        'locked',
    };
  }

  /** Inserts a failure and returns the consecutive failure count including it. */
  async recordFailure(input: {
    identifierHash: string;
    ip: string;
    userId?: string;
    reason: string;
  }): Promise<number> {
    await this.insert({ ...input, success: false });
    const { count } = consecutiveFailures(
      await this.recent(input.identifierHash),
    );
    return count;
  }

  async recordSuccess(input: {
    identifierHash: string;
    ip: string;
    userId: string;
  }): Promise<void> {
    await this.insert({ ...input, success: true, reason: 'login_success' });
  }

  private recent(identifierHash: string): Promise<AttemptStamp[]> {
    return this.attempts
      .find({ identifierHash })
      .sort({ at: -1 })
      .limit(FAILURES_BEFORE_ACCOUNT_LOCK)
      .select({ success: 1, at: 1 })
      .lean()
      .exec();
  }

  private insert(input: {
    identifierHash: string;
    ip: string;
    userId?: string;
    success: boolean;
    reason: string;
  }): Promise<unknown> {
    return this.attempts.create({
      identifierHash: input.identifierHash,
      ip: input.ip,
      userId: input.userId ? new Types.ObjectId(input.userId) : undefined,
      success: input.success,
      reason: input.reason,
      at: new Date(),
    });
  }
}
