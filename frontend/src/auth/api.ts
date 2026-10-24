import {
  apiRequest,
  createIdempotencyKey,
  getDeviceLabel,
  getOrCreateDeviceId,
  setAccessToken,
  setCsrfToken,
} from '@/shared/api/client'

export interface AccessSession {
  accessToken: string
  expiresIn: number
  tokenType: 'Bearer'
  refreshToken: string
  csrfToken: string
}

export interface OtpRequired {
  otpRequired: true
  challengeId: string
}

export interface MfaRequired {
  mfaRequired: true
  challengeId: string
  mfaMethods: Array<'totp' | 'sms'>
  totpEnrollRequired?: boolean
  passwordChangeRequired?: boolean
}

export type LoginResult = AccessSession | OtpRequired | MfaRequired

export function isSession(result: LoginResult): result is AccessSession {
  return 'accessToken' in result && typeof result.accessToken === 'string'
}

export function isOtpRequired(result: LoginResult): result is OtpRequired {
  return 'otpRequired' in result && result.otpRequired === true
}

export function isMfaRequired(result: LoginResult): result is MfaRequired {
  return 'mfaRequired' in result && result.mfaRequired === true
}

/**
 * Farmer login with phone (+251...) and 6-digit PIN.
 */
export async function loginFarmer(phone: string, pin: string): Promise<LoginResult> {
  const result = await apiRequest<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      pin,
      deviceId: getOrCreateDeviceId(),
      deviceLabel: getDeviceLabel(),
    }),
  })
  if (isSession(result)) {
    setAccessToken(result.accessToken)
    setCsrfToken(result.csrfToken)
  }
  return result
}

/**
 * Staff login with identifier (email/phone) and password.
 */
export async function loginStaff(identifier: string, password: string): Promise<LoginResult> {
  const result = await apiRequest<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier,
      password,
      deviceId: getOrCreateDeviceId(),
      deviceLabel: getDeviceLabel(),
    }),
  })
  if (isSession(result)) {
    setAccessToken(result.accessToken)
    setCsrfToken(result.csrfToken)
  }
  return result
}

/**
 * Verify SMS OTP when new device challenge is required.
 */
export async function verifyLoginOtp(challengeId: string, code: string): Promise<LoginResult> {
  const result = await apiRequest<LoginResult>('/auth/login/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      challengeId,
      code,
      deviceId: getOrCreateDeviceId(),
      deviceLabel: getDeviceLabel(),
    }),
  })
  if (isSession(result)) {
    setAccessToken(result.accessToken)
    setCsrfToken(result.csrfToken)
  }
  return result
}

/**
 * Verify Staff MFA (TOTP authenticator app or SMS).
 */
export async function verifyLoginMfa(
  challengeId: string,
  code: string,
  method: 'totp' | 'sms' = 'totp',
  newPassword?: string,
): Promise<LoginResult> {
  const result = await apiRequest<LoginResult>('/auth/login/mfa', {
    method: 'POST',
    body: JSON.stringify({
      challengeId,
      code,
      method,
      newPassword,
      deviceId: getOrCreateDeviceId(),
      deviceLabel: getDeviceLabel(),
    }),
  })
  if (isSession(result)) {
    setAccessToken(result.accessToken)
    setCsrfToken(result.csrfToken)
  }
  return result
}

export async function enrollTotp(challengeId: string): Promise<{ qrDataUrl: string }> {
  return apiRequest('/auth/mfa/totp/enroll', {
    method: 'POST',
    body: JSON.stringify({ challengeId }),
  })
}

export async function confirmTotp(
  challengeId: string,
  code: string,
  newPassword?: string,
): Promise<AccessSession & { recoveryCodes: string[] }> {
  const result = await apiRequest<AccessSession & { recoveryCodes: string[] }>('/auth/mfa/totp/confirm', {
    method: 'POST',
    body: JSON.stringify({
      challengeId,
      code,
      newPassword,
      deviceId: getOrCreateDeviceId(),
      deviceLabel: getDeviceLabel(),
    }),
  })
  setAccessToken(result.accessToken)
  setCsrfToken(result.csrfToken)
  return result
}

/**
 * Farmer activation with paper/SMS activation code (8 chars) and setting initial PIN.
 */
export async function activateFarmer(params: {
  phone: string
  activationCode: string
  pin: string
}): Promise<AccessSession> {
  const result = await apiRequest<AccessSession>('/auth/activate', {
    method: 'POST',
    headers: {
      'Idempotency-Key': createIdempotencyKey(),
    },
    body: JSON.stringify({
      phone: params.phone,
      activationCode: params.activationCode.trim().toUpperCase(),
      pin: params.pin,
      deviceId: getOrCreateDeviceId(),
      deviceLabel: getDeviceLabel(),
    }),
  })
  setAccessToken(result.accessToken)
  setCsrfToken(result.csrfToken)
  return result
}

/**
 * Log out current session.
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest<void>('/auth/logout', { method: 'POST' })
  } finally {
    setAccessToken(null)
    setCsrfToken(null)
  }
}
