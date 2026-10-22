var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Header, HttpCode, HttpStatus, Param, Post, Req, Res, } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '../../common/enums/role.enum.js';
import { CurrentPrincipal, Public, RequireStepUp, Roles, } from '../../common/guards/auth.decorator.js';
import { CSRF_COOKIE, CSRF_HEADER, REFRESH_COOKIE, clearAuthCookies, resolveRefreshToken, setAuthCookies, } from '../auth.cookies.js';
import { AcceptInvitationDto, ChangeSecretDto, EnrollDto, InvitationDto, LoginDto, LoginMfaDto, MfaCodeDto, PasswordResetConfirmDto, PasswordResetRequestDto, PinResetConfirmDto, PinResetRequestDto, RefreshDto, StepUpDto, VerifyOtpDto, } from '../dto/auth.dto.js';
import { toAccessSessionResponse, } from '../response/auth.response.js';
import { AuthService } from '../service/auth.service.js';
import { InvitationService } from '../service/invitation.service.js';
let AuthController = class AuthController {
    auth;
    invitations;
    constructor(auth, invitations) {
        this.auth = auth;
        this.invitations = invitations;
    }
    async login(dto, req, res) {
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
    async verifyOtp(dto, req, res) {
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
    async loginMfa(dto, req, res) {
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
    async refresh(dto, req, res) {
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
    async logout(principal, res) {
        await this.auth.logout(principal.sid);
        clearAuthCookies(res);
    }
    async logoutAll(principal, res) {
        await this.auth.logoutAll(principal.userId);
        clearAuthCookies(res);
    }
    async stepUp(principal, dto, res) {
        const result = await this.auth.stepUp(principal, dto);
        if (result && 'otpRequired' in result) {
            res.status(HttpStatus.ACCEPTED);
            return result;
        }
        return { ok: true };
    }
    enroll(dto) {
        return this.auth.enrollTotp({ challengeId: dto.challengeId });
    }
    async confirmTotp(dto, req, res) {
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
    async requestPinReset(dto) {
        await this.auth.requestPinReset(dto.phone);
    }
    async confirmPinReset(dto) {
        await this.auth.confirmPinReset(dto.phone, dto.code, dto.pin);
    }
    async requestPasswordReset(dto) {
        await this.auth.requestPasswordReset(dto.email);
    }
    async confirmPasswordReset(dto) {
        await this.auth.confirmPasswordReset(dto.token, dto.code, dto.password);
    }
    changePin(principal, dto) {
        return this.auth.changePin(principal.userId, dto.secret);
    }
    changePassword(principal, dto) {
        return this.auth.changePassword(principal.userId, dto.secret);
    }
    acceptInvitation(dto) {
        return this.invitations.accept(dto);
    }
    finish(result, res) {
        if ('mfaRequired' in result || 'otpRequired' in result) {
            res.status(HttpStatus.ACCEPTED);
            return result;
        }
        setAuthCookies(res, result);
        return toAccessSessionResponse(result);
    }
};
__decorate([
    Public(),
    Post('login'),
    Header('Cache-Control', 'no-store'),
    Throttle({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, Body()),
    __param(1, Req()),
    __param(2, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    Public(),
    Post('login/verify-otp'),
    Header('Cache-Control', 'no-store'),
    __param(0, Body()),
    __param(1, Req()),
    __param(2, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyOtpDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    Public(),
    Post('login/mfa'),
    Header('Cache-Control', 'no-store'),
    __param(0, Body()),
    __param(1, Req()),
    __param(2, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginMfaDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginMfa", null);
__decorate([
    Public(),
    Post('refresh'),
    Header('Cache-Control', 'no-store'),
    HttpCode(HttpStatus.OK),
    __param(0, Body()),
    __param(1, Req()),
    __param(2, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RefreshDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    Post('logout'),
    Header('Cache-Control', 'no-store'),
    HttpCode(HttpStatus.NO_CONTENT),
    __param(0, CurrentPrincipal()),
    __param(1, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    Post('logout-all'),
    Header('Cache-Control', 'no-store'),
    HttpCode(HttpStatus.NO_CONTENT),
    __param(0, CurrentPrincipal()),
    __param(1, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutAll", null);
__decorate([
    Post('step-up'),
    Header('Cache-Control', 'no-store'),
    __param(0, CurrentPrincipal()),
    __param(1, Body()),
    __param(2, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, StepUpDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "stepUp", null);
__decorate([
    Public(),
    Post('mfa/totp/enroll'),
    Header('Cache-Control', 'no-store'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [EnrollDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "enroll", null);
__decorate([
    Public(),
    Post('mfa/totp/confirm'),
    Header('Cache-Control', 'no-store'),
    __param(0, Body()),
    __param(1, Req()),
    __param(2, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [MfaCodeDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "confirmTotp", null);
__decorate([
    Public(),
    Post('pin-reset/request'),
    Header('Cache-Control', 'no-store'),
    HttpCode(HttpStatus.ACCEPTED),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PinResetRequestDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestPinReset", null);
__decorate([
    Public(),
    Post('pin-reset/confirm'),
    Header('Cache-Control', 'no-store'),
    HttpCode(HttpStatus.NO_CONTENT),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PinResetConfirmDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "confirmPinReset", null);
__decorate([
    Public(),
    Post('password-reset/request'),
    Header('Cache-Control', 'no-store'),
    HttpCode(HttpStatus.ACCEPTED),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PasswordResetRequestDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestPasswordReset", null);
__decorate([
    Public(),
    Post('password-reset/confirm'),
    Header('Cache-Control', 'no-store'),
    HttpCode(HttpStatus.NO_CONTENT),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PasswordResetConfirmDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "confirmPasswordReset", null);
__decorate([
    RequireStepUp(),
    Post('pin/change'),
    Header('Cache-Control', 'no-store'),
    HttpCode(HttpStatus.NO_CONTENT),
    __param(0, CurrentPrincipal()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ChangeSecretDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePin", null);
__decorate([
    RequireStepUp(),
    Post('password/change'),
    Header('Cache-Control', 'no-store'),
    HttpCode(HttpStatus.NO_CONTENT),
    __param(0, CurrentPrincipal()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ChangeSecretDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
__decorate([
    Public(),
    Post('invitations/accept'),
    Header('Cache-Control', 'no-store'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AcceptInvitationDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "acceptInvitation", null);
AuthController = __decorate([
    Controller('auth'),
    __metadata("design:paramtypes", [AuthService,
        InvitationService])
], AuthController);
export { AuthController };
let InvitationController = class InvitationController {
    invitations;
    constructor(invitations) {
        this.invitations = invitations;
    }
    create(principal, dto) {
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
    approve(principal, id) {
        return this.invitations.approve(principal, id);
    }
    revoke(principal, id) {
        return this.invitations.revoke(principal, id);
    }
};
__decorate([
    Roles(Role.NATIONAL_ADMIN, Role.REGIONAL_ADMIN),
    RequireStepUp(),
    Post(),
    Header('Cache-Control', 'no-store'),
    __param(0, CurrentPrincipal()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, InvitationDto]),
    __metadata("design:returntype", void 0)
], InvitationController.prototype, "create", null);
__decorate([
    Roles(Role.NATIONAL_ADMIN),
    RequireStepUp(),
    Post(':id/approve'),
    Header('Cache-Control', 'no-store'),
    __param(0, CurrentPrincipal()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InvitationController.prototype, "approve", null);
__decorate([
    Roles(Role.NATIONAL_ADMIN, Role.REGIONAL_ADMIN),
    RequireStepUp(),
    Post(':id/revoke'),
    Header('Cache-Control', 'no-store'),
    HttpCode(HttpStatus.NO_CONTENT),
    __param(0, CurrentPrincipal()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InvitationController.prototype, "revoke", null);
InvitationController = __decorate([
    Controller('admin/invitations'),
    __metadata("design:paramtypes", [InvitationService])
], InvitationController);
export { InvitationController };
function clientIp(req) {
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}
//# sourceMappingURL=auth.controller.js.map