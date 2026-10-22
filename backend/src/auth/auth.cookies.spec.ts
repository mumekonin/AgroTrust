import { AppException } from '../common/errors/app.exception.js';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE,
  REFRESH_COOKIE,
  csrfMatches,
  refreshCookieOptions,
  resolveRefreshToken,
} from './auth.cookies.js';

describe('csrfMatches', () => {
  it('accepts an identical header and cookie', () => {
    expect(csrfMatches('token-value', 'token-value')).toBe(true);
  });

  it('rejects a missing or different value', () => {
    expect(csrfMatches(undefined, 'token-value')).toBe(false);
    expect(csrfMatches('token-value', undefined)).toBe(false);
    expect(csrfMatches('token-value', 'other-value')).toBe(false);
    expect(csrfMatches('short', 'longer')).toBe(false);
  });
});

describe('resolveRefreshToken', () => {
  it('uses the cookie only when the CSRF header matches', () => {
    expect(
      resolveRefreshToken({
        cookieToken: 'refresh',
        bodyToken: 'ignored',
        csrfHeader: 'csrf',
        csrfCookie: 'csrf',
      }),
    ).toBe('refresh');
  });

  it('rejects a cookie refresh without a matching CSRF header', () => {
    expect(() =>
      resolveRefreshToken({
        cookieToken: 'refresh',
        csrfHeader: 'nope',
        csrfCookie: 'csrf',
      }),
    ).toThrow(AppException);
  });

  it('accepts a body token when no cookie was sent', () => {
    expect(resolveRefreshToken({ bodyToken: 'mobile-refresh' })).toBe(
      'mobile-refresh',
    );
  });

  it('rejects a refresh with neither cookie nor body', () => {
    expect(() => resolveRefreshToken({})).toThrow(AppException);
  });
});

describe('refreshCookieOptions', () => {
  it('sets the httpOnly refresh cookie on the auth path', () => {
    const expires = new Date('2026-10-22T12:00:00.000Z');
    expect(refreshCookieOptions(expires)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: AUTH_COOKIE_PATH,
      expires,
    });
    expect(REFRESH_COOKIE).toBe('__Host-rt');
    expect(CSRF_COOKIE).toBe('csrf-token');
  });
});
