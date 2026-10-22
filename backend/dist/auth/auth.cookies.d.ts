import type { CookieOptions, Response } from 'express';
export declare const REFRESH_COOKIE = "__Host-rt";
export declare const CSRF_COOKIE = "csrf-token";
export declare const CSRF_HEADER = "x-csrf-token";
export declare const AUTH_COOKIE_PATH = "/api/v1/auth";
export declare function generateCsrfToken(): string;
export declare function csrfMatches(header: string | undefined, cookie: string | undefined): boolean;
export declare function refreshCookieOptions(expires: Date): CookieOptions;
export declare function csrfCookieOptions(expires: Date): CookieOptions;
export declare function resolveRefreshToken(input: {
    cookieToken?: string;
    bodyToken?: string;
    csrfHeader?: string;
    csrfCookie?: string;
}): string;
export declare function setAuthCookies(res: Response, issued: {
    refreshToken: string;
    refreshExpiresAt: Date;
    csrfToken: string;
}): void;
export declare function clearAuthCookies(res: Response): void;
