import type { Request, Response } from 'express';
import { AppException } from '../../common/errors/app.exception.js';
import { CSRF_COOKIE, REFRESH_COOKIE } from '../auth.cookies.js';
import { AuthController } from './auth.controller.js';

function response(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response;
}

function request(
  options: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  } = {},
): Request {
  const headers = options.headers ?? {};
  return {
    ip: '203.0.113.4',
    socket: { remoteAddress: '203.0.113.4' },
    cookies: options.cookies ?? {},
    get: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

describe('AuthController', () => {
  const auth = {
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
  };
  const controller = new AuthController(auth as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets the refresh and CSRF cookies when login opens a session', async () => {
    const expires = new Date('2026-11-21T00:00:00.000Z');
    auth.login.mockResolvedValue({
      accessToken: 'access-1',
      expiresIn: 900,
      refreshToken: 'refresh-1',
      refreshExpiresAt: expires,
      csrfToken: 'csrf-1',
    });
    const res = response();

    const body = await controller.login(
      { phone: '0911234567', pin: '048215', deviceId: 'device-1' },
      request(),
      res,
    );

    expect(body).toMatchObject({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      csrfToken: 'csrf-1',
    });
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      'refresh-1',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      CSRF_COOKIE,
      'csrf-1',
      expect.objectContaining({ httpOnly: false }),
    );
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 202 and does not set cookies when staff MFA is still required', async () => {
    auth.login.mockResolvedValue({ mfaRequired: true, mfaMethods: ['totp'] });
    const res = response();

    const body = await controller.login(
      {
        identifier: 'admin@example.com',
        password: 'Tractor-Mango-Lake',
        deviceId: 'device-1',
      },
      request(),
      res,
    );

    expect(body).toEqual({ mfaRequired: true, mfaMethods: ['totp'] });
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('rejects a cookie refresh when the CSRF header does not match', async () => {
    const res = response();
    await expect(
      controller.refresh(
        {},
        request({
          cookies: { [REFRESH_COOKIE]: 'refresh-1', [CSRF_COOKIE]: 'csrf-1' },
          headers: { 'x-csrf-token': 'nope' },
        }),
        res,
      ),
    ).rejects.toBeInstanceOf(AppException);
    expect(auth.refresh).not.toHaveBeenCalled();
  });

  it('rotates a body refresh token for a client that has no cookie', async () => {
    auth.refresh.mockResolvedValue({
      accessToken: 'access-2',
      expiresIn: 900,
      refreshToken: 'refresh-2',
      refreshExpiresAt: new Date('2026-11-21T00:00:00.000Z'),
      csrfToken: 'csrf-2',
    });

    const body = await controller.refresh(
      { refreshToken: 'refresh-1' },
      request(),
      response(),
    );

    expect(auth.refresh).toHaveBeenCalledWith('refresh-1');
    expect(body.refreshToken).toBe('refresh-2');
  });

  it('clears cookies after logout', async () => {
    auth.logout.mockResolvedValue(undefined);
    const res = response();

    await controller.logout(
      request({ headers: { authorization: 'Bearer access-1' } }),
      res,
    );

    expect(auth.logout).toHaveBeenCalledWith('access-1');
    expect(res.clearCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('rejects logout without a bearer token', async () => {
    await expect(
      controller.logout(request(), response()),
    ).rejects.toBeInstanceOf(AppException);
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
