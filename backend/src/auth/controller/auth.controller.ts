import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Role } from '../../common/enums/role.enum.js';
import {
  CurrentPrincipal,
  Public,
  RequireStepUp,
  Roles,
  type Principal,
} from '../../common/guards/auth.decorator.js';
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  REFRESH_COOKIE,
  clearAuthCookies,
  resolveRefreshToken,
  setAuthCookies,
} from '../auth.cookies.js';
import {
  AcceptInvitationDto,
  ChangeSecretDto,
  EnrollDto,
  InvitationDto,
  LoginDto,
  LoginMfaDto,
  MfaCodeDto,
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
  PinResetConfirmDto,
  PinResetRequestDto,
  RefreshDto,
  StepUpDto,
  VerifyOtpDto,
} from '../dto/auth.dto.js';
import {
  type MfaRequiredResponse,
  type OtpRequiredResponse,
  toAccessSessionResponse,
} from '../response/auth.response.js';
import { AuthService, type IssuedLogin } from '../service/auth.service.js';
import { InvitationService } from '../service/invitation.service.js';

type CookieRequest = Request & { cookies?: Record<string, string | undefined> };
type LoginBody = ReturnType<typeof toAccessSessionResponse> | MfaRequiredResponse | OtpRequiredResponse;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly invitations: InvitationService,
  ) {}

  @Public()
  @Post('login')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginBody> {
    const result = await this.auth.login({
      phone: dto.phone,
      pin: dto.pin,
      identifier: dto.identifier,
      password: dto.password,
      deviceId: dto.deviceId,
      deviceLabel: dto.deviceLabel,
      ip: clientIp(req),
      userAgent: req.get('user-agent'),
    });
    return this.finish(result, res);
  }

  @Public()
  @Post('login/verify-otp')
  @Header('Cache-Control', 'no-store')
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verifyLoginOtp({
      challengeId: dto.challengeId,
      code: dto.code,
      deviceId: dto.deviceId,
      deviceLabel: dto.deviceLabel,
      ip: clientIp(req),
      userAgent: req.get('user-agent'),
    });
    return this.finish(result, res);
  }

  @Public()
  @Post('login/mfa')
  @Header('Cache-Control', 'no-store')
  async loginMfa(
    @Body() dto: LoginMfaDto,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginBody> {
    const result = await this.auth.verifyLoginMfa({
      challengeId: dto.challengeId,
      code: dto.code,
      method: dto.method,
      newPassword: dto.newPassword,
      deviceId: dto.deviceId,
      deviceLabel: dto.deviceLabel,
      ip: clientIp(req),
      userAgent: req.get('user-agent'),
    });
    return this.finish(result, res);
  }

  @Public()
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
    @CurrentPrincipal() principal: Principal,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(principal.sid);
    clearAuthCookies(res);
  }

  @Post('logout-all')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @CurrentPrincipal() principal: Principal,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logoutAll(principal.userId);
    clearAuthCookies(res);
  }

  @Post('step-up')
  @Header('Cache-Control', 'no-store')
  async stepUp(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: StepUpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.stepUp(principal, dto);
    if (result && 'otpRequired' in result) {
      res.status(HttpStatus.ACCEPTED);
      return result;
    }
    return { ok: true };
  }

  @Public()
  @Post('mfa/totp/enroll')
  @Header('Cache-Control', 'no-store')
  enroll(@Body() dto: EnrollDto) {
    return this.auth.enrollTotp({ challengeId: dto.challengeId });
  }

  @Public()
  @Post('mfa/totp/confirm')
  @Header('Cache-Control', 'no-store')
  async confirmTotp(
    @Body() dto: MfaCodeDto,
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.confirmTotp({
      challengeId: dto.challengeId,
      code: dto.code,
      deviceId: dto.deviceId,
      deviceLabel: dto.deviceLabel,
      ip: clientIp(req),
      userAgent: req.get('user-agent'),
    });
    setAuthCookies(res, result);
    return { ...toAccessSessionResponse(result), recoveryCodes: result.recoveryCodes };
  }

  @Public()
  @Post('pin-reset/request')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestPinReset(@Body() dto: PinResetRequestDto): Promise<void> {
    await this.auth.requestPinReset(dto.phone);
  }

  @Public()
  @Post('pin-reset/confirm')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmPinReset(@Body() dto: PinResetConfirmDto): Promise<void> {
    await this.auth.confirmPinReset(dto.phone, dto.code, dto.pin);
  }

  @Public()
  @Post('password-reset/request')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto): Promise<void> {
    await this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('password-reset/confirm')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmPasswordReset(@Body() dto: PasswordResetConfirmDto): Promise<void> {
    await this.auth.confirmPasswordReset(dto.token, dto.code, dto.password);
  }

  @RequireStepUp()
  @Post('pin/change')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePin(@CurrentPrincipal() principal: Principal, @Body() dto: ChangeSecretDto): Promise<void> {
    return this.auth.changePin(principal.userId, dto.secret);
  }

  @RequireStepUp()
  @Post('password/change')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: ChangeSecretDto,
  ): Promise<void> {
    return this.auth.changePassword(principal.userId, dto.secret);
  }

  @Public()
  @Post('invitations/accept')
  @Header('Cache-Control', 'no-store')
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.invitations.accept(dto);
  }

  private finish(
    result: IssuedLogin | MfaRequiredResponse | OtpRequiredResponse,
    res: Response,
  ) {
    if ('mfaRequired' in result || 'otpRequired' in result) {
      res.status(HttpStatus.ACCEPTED);
      return result;
    }
    setAuthCookies(res, result);
    return toAccessSessionResponse(result);
  }
}

@Controller('admin/invitations')
export class InvitationController {
  constructor(private readonly invitations: InvitationService) {}

  @Roles(Role.NATIONAL_ADMIN, Role.REGIONAL_ADMIN)
  @RequireStepUp()
  @Post()
  @Header('Cache-Control', 'no-store')
  create(@CurrentPrincipal() principal: Principal, @Body() dto: InvitationDto) {
    return this.invitations.create(principal, {
      role: dto.role,
      email: dto.email,
      phone: dto.phone,
      scope: {
        regionIds: dto.regionIds,
        woredaIds: dto.woredaIds,
        localCenterIds: dto.localCenterIds,
        distributorId: dto.distributorId,
      },
    });
  }

  @Roles(Role.NATIONAL_ADMIN)
  @RequireStepUp()
  @Post(':id/approve')
  @Header('Cache-Control', 'no-store')
  approve(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.invitations.approve(principal, id);
  }

  @Roles(Role.NATIONAL_ADMIN, Role.REGIONAL_ADMIN)
  @RequireStepUp()
  @Post(':id/revoke')
  @Header('Cache-Control', 'no-store')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@CurrentPrincipal() principal: Principal, @Param('id') id: string): Promise<void> {
    return this.invitations.revoke(principal, id);
  }
}

function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}
