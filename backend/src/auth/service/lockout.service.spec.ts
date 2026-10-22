import { UserStatus } from '../../users/schema/user.schema.js';
import {
  consecutiveFailures,
  failureIsLockout,
  lockoutFromFailures,
  shouldLockAccount,
} from './lockout.service.js';

const MINUTE = 60_000;

describe('consecutiveFailures', () => {
  it('stops at the newest success', () => {
    const now = new Date('2026-10-22T12:00:00.000Z');
    expect(
      consecutiveFailures([
        { success: false, at: now },
        { success: false, at: new Date(now.getTime() - MINUTE) },
        { success: true, at: new Date(now.getTime() - 2 * MINUTE) },
        { success: false, at: new Date(now.getTime() - 3 * MINUTE) },
      ]),
    ).toEqual({ count: 2, lastFailureAt: now });
  });

  it('returns zero when the newest attempt succeeded', () => {
    expect(consecutiveFailures([{ success: true, at: new Date() }])).toEqual({
      count: 0,
      lastFailureAt: undefined,
    });
  });
});

describe('lockoutFromFailures', () => {
  const now = new Date('2026-10-22T12:00:00.000Z');

  it('allows fewer than five failures', () => {
    expect(lockoutFromFailures(4, new Date(now.getTime() - MINUTE), now)).toBe(
      'ok',
    );
  });

  it('locks for 15 minutes after five consecutive failures', () => {
    expect(
      lockoutFromFailures(5, new Date(now.getTime() - 14 * MINUTE), now),
    ).toBe('locked');
    expect(
      lockoutFromFailures(5, new Date(now.getTime() - 15 * MINUTE), now),
    ).toBe('ok');
  });

  it('locks for one hour after ten consecutive failures', () => {
    expect(
      lockoutFromFailures(10, new Date(now.getTime() - 59 * MINUTE), now),
    ).toBe('locked');
    expect(
      lockoutFromFailures(10, new Date(now.getTime() - 60 * MINUTE), now),
    ).toBe('ok');
  });

  it('keeps a twenty-failure or locked account blocked after the window', () => {
    const old = new Date(now.getTime() - 2 * 86_400_000);
    expect(lockoutFromFailures(20, old, now)).toBe('locked');
    expect(lockoutFromFailures(0, undefined, now, UserStatus.LOCKED)).toBe(
      'locked',
    );
  });
});

describe('failure thresholds', () => {
  it('treats the fifth failure as lockout and the twentieth as an account lock', () => {
    expect(failureIsLockout(4)).toBe(false);
    expect(failureIsLockout(5)).toBe(true);
    expect(shouldLockAccount(19)).toBe(false);
    expect(shouldLockAccount(20)).toBe(true);
  });
});
