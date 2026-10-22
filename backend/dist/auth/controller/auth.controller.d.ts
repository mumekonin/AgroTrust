import type { Request, Response } from 'express';
import { type Principal } from '../../common/guards/auth.decorator.js';
import { AcceptInvitationDto, ChangeSecretDto, EnrollDto, InvitationDto, LoginDto, LoginMfaDto, MfaCodeDto, PasswordResetConfirmDto, PasswordResetRequestDto, PinResetConfirmDto, PinResetRequestDto, RefreshDto, StepUpDto, VerifyOtpDto } from '../dto/auth.dto.js';
import { type MfaRequiredResponse, type OtpRequiredResponse, toAccessSessionResponse } from '../response/auth.response.js';
import { AuthService } from '../service/auth.service.js';
import { InvitationService } from '../service/invitation.service.js';
type CookieRequest = Request & {
    cookies?: Record<string, string | undefined>;
};
type LoginBody = ReturnType<typeof toAccessSessionResponse> | MfaRequiredResponse | OtpRequiredResponse;
export declare class AuthController {
    private readonly auth;
    private readonly invitations;
    constructor(auth: AuthService, invitations: InvitationService);
    login(dto: LoginDto, req: CookieRequest, res: Response): Promise<LoginBody>;
    verifyOtp(dto: VerifyOtpDto, req: CookieRequest, res: Response): Promise<import("../response/auth.response.js").AccessSessionResponse | MfaRequiredResponse | OtpRequiredResponse>;
    loginMfa(dto: LoginMfaDto, req: CookieRequest, res: Response): Promise<LoginBody>;
    refresh(dto: RefreshDto, req: CookieRequest, res: Response): Promise<import("../response/auth.response.js").AccessSessionResponse>;
    logout(principal: Principal, res: Response): Promise<void>;
    logoutAll(principal: Principal, res: Response): Promise<void>;
    stepUp(principal: Principal, dto: StepUpDto, res: Response): Promise<OtpRequiredResponse | {
        ok: boolean;
    }>;
    enroll(dto: EnrollDto): Promise<{
        otpauthUri: string;
        qrDataUrl: string;
    }>;
    confirmTotp(dto: MfaCodeDto, req: CookieRequest, res: Response): Promise<{
        recoveryCodes: string[];
        accessToken: string;
        expiresIn: number;
        tokenType: "Bearer";
        refreshToken: string;
        csrfToken: string;
    }>;
    requestPinReset(dto: PinResetRequestDto): Promise<void>;
    confirmPinReset(dto: PinResetConfirmDto): Promise<void>;
    requestPasswordReset(dto: PasswordResetRequestDto): Promise<void>;
    confirmPasswordReset(dto: PasswordResetConfirmDto): Promise<void>;
    changePin(principal: Principal, dto: ChangeSecretDto): Promise<void>;
    changePassword(principal: Principal, dto: ChangeSecretDto): Promise<void>;
    acceptInvitation(dto: AcceptInvitationDto): Promise<{
        challengeId: string;
    }>;
    private finish;
}
export declare class InvitationController {
    private readonly invitations;
    constructor(invitations: InvitationService);
    create(principal: Principal, dto: InvitationDto): Promise<{
        id: string;
        status: import("../schema/invitation.schema.js").InvitationStatus;
        expiresAt: Date;
        token?: string;
    }>;
    approve(principal: Principal, id: string): Promise<{
        token: string;
        expiresAt: Date;
    }>;
    revoke(principal: Principal, id: string): Promise<void>;
}
export {};
