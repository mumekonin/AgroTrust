import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Response } from 'express';
import { AppException } from '../common/errors/app.exception.js';
import { ErrorCode } from '../common/errors/error-codes.js';

/** §3.3.3. `__Host-` cookies must not set Domain. */
export const REFRESH_COOKIE = '__Host-rt';
export const CSRF_COOKIE = 'csrf-token';
export const CSRF_HEADER = 'x-csrf-token';
export const AUTH_COOKIE_PATH = '/api/v1/auth';

const invalidSession = () =>
  new AppException(
    ErrorCode.UNAUTHENTICATED,
    'Invalid or expired session',
    401,
  );

export function generateCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

export function csrfMatches(
  header: string | undefined,
  cookie: string | undefined,
): boolean {
  if (!header || !cookie) return false;
  const left = Buffer.from(header);
  const right = Buffer.from(cookie);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function refreshCookieOptions(expires: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: AUTH_COOKIE_PATH,
    expires,
  };
}

export function csrfCookieOptions(expires: Date): CookieOptions {
  return {
    httpOnly: false,
    secure: true,
    sameSite: 'strict',
    path: AUTH_COOKIE_PATH,
    expires,
  };
}

/** Cookie wins when the browser sent one, and then the CSRF header must match (§3.3.3). */
export function resolveRefreshToken(input: {
  cookieToken?: string;
  bodyToken?: string;
  csrfHeader?: string;
  csrfCookie?: string;
}): string {
  if (input.cookieToken) {
    if (!csrfMatches(input.csrfHeader, input.csrfCookie))
      throw invalidSession();
    return input.cookieToken;
  }
  if (input.bodyToken) return input.bodyToken;
  throw invalidSession();
}

export function setAuthCookies(
  res: Response,
  issued: { refreshToken: string; refreshExpiresAt: Date; csrfToken: string },
): void {
  res.cookie(
    REFRESH_COOKIE,
    issued.refreshToken,
    refreshCookieOptions(issued.refreshExpiresAt),
  );
  res.cookie(
    CSRF_COOKIE,
    issued.csrfToken,
    csrfCookieOptions(issued.refreshExpiresAt),
  );
}

export function clearAuthCookies(res: Response): void {
  const shared = {
    path: AUTH_COOKIE_PATH,
    secure: true,
    sameSite: 'strict' as const,
  };
  res.clearCookie(REFRESH_COOKIE, { ...shared, httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...shared, httpOnly: false });
}
