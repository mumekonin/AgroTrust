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

export function toAccessSessionResponse(issued: {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  csrfToken: string;
}): AccessSessionResponse {
  return {
    accessToken: issued.accessToken,
    expiresIn: issued.expiresIn,
    tokenType: 'Bearer',
    refreshToken: issued.refreshToken,
    csrfToken: issued.csrfToken,
  };
}
