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
import { Body, Controller, Header, HttpCode, HttpStatus, Post, Req, Res, } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CSRF_COOKIE, CSRF_HEADER, REFRESH_COOKIE, clearAuthCookies, resolveRefreshToken, setAuthCookies, } from '../auth.cookies.js';
import { LoginDto, RefreshDto } from '../dto/auth.dto.js';
import { toAccessSessionResponse, } from '../response/auth.response.js';
import { AuthService } from '../service/auth.service.js';
let AuthController = class AuthController {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    async login(dto, req, res) {
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
    async logout(req, res) {
        await this.auth.logout(bearer(req.get('authorization')));
        clearAuthCookies(res);
    }
    async logoutAll(req, res) {
        await this.auth.logoutAll(bearer(req.get('authorization')));
        clearAuthCookies(res);
    }
};
__decorate([
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
    __param(0, Req()),
    __param(1, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    Post('logout-all'),
    Header('Cache-Control', 'no-store'),
    HttpCode(HttpStatus.NO_CONTENT),
    __param(0, Req()),
    __param(1, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutAll", null);
AuthController = __decorate([
    Controller('auth'),
    __metadata("design:paramtypes", [AuthService])
], AuthController);
export { AuthController };
function bearer(header) {
    if (!header?.startsWith('Bearer ')) {
        throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired token', 401);
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
        throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired token', 401);
    }
    return token;
}
//# sourceMappingURL=auth.controller.js.map