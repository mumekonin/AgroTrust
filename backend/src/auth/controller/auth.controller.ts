import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  REFRESH_COOKIE,
  clearAuthCookies,
  resolveRefreshToken,
  setAuthCookies,
} from '../auth.cookies.js';
import { LoginDto, RefreshDto } from '../dto/auth.dto.js';
import {
  type MfaRequiredResponse,
  toAccessSessionResponse,
} from '../response/auth.response.js';
import { AuthService } from '../service/auth.service.js';

type CookieRequest = Request & { cookies?: Record<string, string | undefined> };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReturnType<typeof toAccessSessionResponse> | MfaRequiredResponse> {
    const result = await this.auth.login({
      phone: dto.phone,
      pin: dto.pin,
      identifier: dto.identifier,
      password: dto.password,
      deviceId: dto.deviceId,
      deviceLabel: dto.deviceLabel,
      ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
      userAgent: req.get('user-agent'),
    });

    if ('mfaRequired' in result) {
      res.status(HttpStatus.ACCEPTED);
      return result;
    }

    setAuthCookies(res, result);
    return toAccessSessionResponse(result);
  }

  @Post('refresh')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = resolveRefreshToken({
      cookieToken: req.cookies?.[REFRESH_COOKIE],
      bodyToken: dto.refreshToken,
      csrfHeader: req.get(CSRF_HEADER),
      csrfCookie: req.cookies?.[CSRF_COOKIE],
    });
    const issued = await this.auth.refresh(raw);
    setAuthCookies(res, issued);
    return toAccessSessionResponse(issued);
  }

  @Post('logout')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(bearer(req.get('authorization')));
    clearAuthCookies(res);
  }

  @Post('logout-all')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logoutAll(bearer(req.get('authorization')));
    clearAuthCookies(res);
  }
}

function bearer(header: string | undefined): string {
  if (!header?.startsWith('Bearer ')) {
    throw new AppException(
      ErrorCode.UNAUTHENTICATED,
      'Invalid or expired token',
      401,
    );
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw new AppException(
      ErrorCode.UNAUTHENTICATED,
      'Invalid or expired token',
      401,
    );
  }
  return token;
}
