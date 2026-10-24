import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from '@/shared/i18n/LangContext'
import { AuthLayout } from '../components/AuthLayout'
import { PinInput } from '../components/PinInput'
import { Button } from '@/shared/ui/Button'
import { Icon } from '@/shared/ui/Icon'
import {
  isOtpRequired,
  isSession,
  loginFarmer,
  verifyLoginOtp,
} from '../api'
import { ApiError } from '@/shared/api/client'

export function FarmerLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Step state: 'credentials' | 'otp' | 'success'
  const [step, setStep] = useState<'credentials' | 'otp' | 'success'>('credentials')

  // Form values
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [challengeId, setChallengeId] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Normalize phone for Ethiopia (+251...)
  const normalizePhone = (raw: string): string => {
    const cleaned = raw.replace(/[^\d+]/g, '')
    if (cleaned.startsWith('09') || cleaned.startsWith('07')) {
      return '+251' + cleaned.slice(1)
    }
    if (cleaned.startsWith('9') || cleaned.startsWith('7')) {
      return '+251' + cleaned
    }
    return cleaned
  }

  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const normalized = normalizePhone(phone)
    if (!normalized || normalized.length < 10) {
      setErrorMessage(t('errorInvalidPhone'))
      return
    }

    if (pin.length !== 6) {
      setErrorMessage(t('errorPinLength'))
      return
    }

    setLoading(true)
    try {
      const res = await loginFarmer(normalized, pin)

      if (isSession(res)) {
        setStep('success')
        setTimeout(() => navigate('/farmer'), 800)
      } else if (isOtpRequired(res)) {
        setChallengeId(res.challengeId)
        setStep('otp')
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail || err.problem.title || t('errorGeneric'))
      } else {
        setErrorMessage(t('errorGeneric'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (otpCode.length !== 6) {
      setErrorMessage(t('errorPinLength'))
      return
    }

    setLoading(true)
    try {
      const res = await verifyLoginOtp(challengeId, otpCode)
      if (isSession(res)) {
        setStep('success')
        setTimeout(() => navigate('/farmer'), 800)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail || err.problem.title || t('errorGeneric'))
      } else {
        setErrorMessage(t('errorGeneric'))
      }
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <AuthLayout
        title={t('authFarmerTitle')}
        iconName="check_circle"
        badgeText={t('portalFarmerTitle')}
      >
        <div className="auth-success">
          <p className="auth-success__title">{t('signedIn')}</p>
          <p className="auth-success__body">{t('openingFarmer')}</p>
        </div>
      </AuthLayout>
    )
  }

  if (step === 'otp') {
    return (
      <AuthLayout
        title={t('labelOtpCode')}
        subtitle={`${t('otpSentTo')} ${phone}`}
        iconName="sms"
        badgeText={t('portalFarmerTitle')}
      >
        <form onSubmit={handleOtpSubmit} className="auth-form">
          {errorMessage && (
            <div className="auth-error-banner" role="alert">
              <Icon name="error" size="sm" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">{t('labelOtpCode')}</label>
            <PinInput
              value={otpCode}
              onChange={setOtpCode}
              disabled={loading}
              error={Boolean(errorMessage)}
              autoFocus
            />
            <span className="auth-helper">{t('otpPlaceholder')}</span>
          </div>

          <Button type="submit" disabled={loading || otpCode.length !== 6} fullWidth>
            {loading ? t('btnVerify') + '...' : t('btnVerify')}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setStep('credentials')
              setOtpCode('')
              setErrorMessage(null)
            }}
            disabled={loading}
            fullWidth
          >
            {t('btnBack')}
          </Button>
        </form>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('authFarmerTitle')}
      subtitle={t('authFarmerSubtitle')}
      iconName="agriculture"
      badgeText={t('portalFarmerTitle')}
    >
      <form onSubmit={handleCredentialsSubmit} className="auth-form">
        {errorMessage && (
          <div className="auth-error-banner" role="alert">
            <Icon name="error" size="sm" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Phone input */}
        <div className="auth-field">
          <label htmlFor="farmer-phone" className="auth-label">
            {t('labelPhone')}
          </label>
          <div className="auth-input-wrapper">
            <Icon name="phone" size="sm" className="auth-input-icon" />
            <input
              id="farmer-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t('phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`auth-input ${errorMessage && !phone ? 'auth-input--error' : ''}`}
              disabled={loading}
              required
            />
          </div>
          <span className="auth-helper">{t('phoneExample')}</span>
        </div>

        {/* 6-digit PIN */}
        <div className="auth-field">
          <label className="auth-label">{t('labelPin')}</label>
          <PinInput
            value={pin}
            onChange={setPin}
            disabled={loading}
            error={Boolean(errorMessage && pin.length < 6)}
          />
          <span className="auth-helper">{t('pinPlaceholder')}</span>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading || !phone || pin.length !== 6}
          fullWidth
        >
          {loading ? t('btnSignIn') + '...' : t('btnSignIn')}
        </Button>

        {/* Footer links */}
        <div className="auth-links">
          <Link to="/auth/activate" className="auth-link">
            {t('linkActivate')}
          </Link>
          <Link to="/auth/staff" className="auth-link" style={{ color: 'var(--color-text-subtle)' }}>
            {t('linkStaffLogin')}
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
