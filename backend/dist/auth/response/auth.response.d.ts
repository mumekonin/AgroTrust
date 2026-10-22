export interface AccessSessionResponse {
    accessToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
    refreshToken: string;
    csrfToken: string;
}
export interface MfaRequiredResponse {
    mfaRequired: true;
    mfaMethods: Array<'totp' | 'sms'>;
    challengeId: string;
    totpEnrollRequired?: boolean;
    passwordChangeRequired?: boolean;
}
export interface OtpRequiredResponse {
    otpRequired: true;
    challengeId: string;
}
export declare function toAccessSessionResponse(issued: {
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
    csrfToken: string;
}): AccessSessionResponse;
