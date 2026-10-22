export interface AccessSessionResponse {
    accessToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
    refreshToken: string;
    csrfToken: string;
}
export interface MfaRequiredResponse {
    mfaRequired: true;
    mfaMethods: ['totp'];
}
export declare function toAccessSessionResponse(issued: {
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
    csrfToken: string;
}): AccessSessionResponse;
