import { type Role } from '../../common/enums/role.enum.js';
export declare class LoginDto {
    phone?: string;
    pin?: string;
    identifier?: string;
    password?: string;
    deviceId: string;
    deviceLabel?: string;
}
export declare class RefreshDto {
    refreshToken?: string;
}
export declare class VerifyOtpDto {
    challengeId: string;
    code: string;
    deviceId: string;
    deviceLabel?: string;
}
export declare class LoginMfaDto {
    challengeId: string;
    code?: string;
    method?: 'totp' | 'sms' | 'recovery';
    newPassword?: string;
    deviceId: string;
    deviceLabel?: string;
}
export declare class StepUpDto {
    pin?: string;
    password?: string;
    code?: string;
}
export declare class PinResetRequestDto {
    phone: string;
}
export declare class PinResetConfirmDto {
    phone: string;
    code: string;
    pin: string;
}
export declare class PasswordResetRequestDto {
    email: string;
}
export declare class PasswordResetConfirmDto {
    token: string;
    code: string;
    password: string;
}
export declare class ChangeSecretDto {
    secret: string;
}
export declare class InvitationDto {
    role: Role;
    email?: string;
    phone?: string;
    regionIds?: string[];
    woredaIds?: string[];
    localCenterIds?: string[];
    distributorId?: string;
}
export declare class AcceptInvitationDto {
    token: string;
    code: string;
    password: string;
}
export declare class MfaCodeDto {
    challengeId?: string;
    code: string;
    deviceId: string;
    deviceLabel?: string;
}
export declare class EnrollDto {
    challengeId?: string;
}
