import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLang, useTranslation } from '@/shared/i18n/LangContext'
import { AuthLayout } from '../components/AuthLayout'
import { PinInput } from '../components/PinInput'
import { Button } from '@/shared/ui/Button'
import { Icon } from '@/shared/ui/Icon'
import {
  confirmTotp,
  enrollTotp,
  isMfaRequired,
  isSession,
  loginStaff,
  verifyLoginMfa,
} from '../api'
import { ApiError, readAccessRole } from '@/shared/api/client'

export function StaffLoginPage() {
  const { t, locale } = useTranslation()
  const { t: copy } = useLang()
  const navigate = useNavigate()

  const [step, setStep] = useState<'credentials' | 'mfa' | 'recovery' | 'success'>('credentials')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false)
  const [totpEnrollRequired, setTotpEnrollRequired] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const enrollRequest = useRef(0)

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!identifier.trim()) {
      setErrorMessage(t('errorRequired'))
      return
    }
    if (!password) {
      setErrorMessage(t('errorRequired'))
      return
    }

    setLoading(true)
    try {
      const res = await loginStaff(identifier.trim(), password)

      if (isSession(res)) {
        setStep('success')
        setTimeout(() => navigate(staffHome()), 800)
      } else if (isMfaRequired(res)) {
        setChallengeId(res.challengeId)
        setPasswordChangeRequired(Boolean(res.passwordChangeRequired))
        setTotpEnrollRequired(Boolean(res.totpEnrollRequired))
        setQrDataUrl('')
        setStep('mfa')
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

  useEffect(() => {
    if (step !== 'mfa' || !totpEnrollRequired || !challengeId) return
    const request = ++enrollRequest.current
    enrollTotp(challengeId)
      .then((result) => {
        if (request === enrollRequest.current) setQrDataUrl(result.qrDataUrl)
      })
      .catch((err: unknown) => {
        if (request !== enrollRequest.current) return
        setErrorMessage(err instanceof ApiError ? err.detail || err.problem.title : copy.errorGeneric)
      })
  }, [step, totpEnrollRequired, challengeId, locale, copy.errorGeneric])

  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (totpCode.length !== 6) {
      setErrorMessage(t('errorPinLength'))
      return
    }

    if (passwordChangeRequired && !newPassword) {
      setErrorMessage(t('errorRequired'))
      return
    }

    setLoading(true)
    try {
      if (totpEnrollRequired) {
        const enrolled = await confirmTotp(
          challengeId,
          totpCode,
          passwordChangeRequired ? newPassword : undefined,
        )
        setRecoveryCodes(enrolled.recoveryCodes)
        setStep('recovery')
        return
      }
      const res = await verifyLoginMfa(
        challengeId,
        totpCode,
        'totp',
        passwordChangeRequired ? newPassword : undefined,
      )
      if (isSession(res)) {
        setStep('success')
        setTimeout(() => navigate(staffHome()), 800)
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
        title={t('authStaffTitle')}
        iconName="verified_user"
        badgeText={t('staffBadge')}
      >
        <div className="auth-success">
          <p className="auth-success__title">{t('signedIn')}</p>
          <p className="auth-success__body">{t('openingStaff')}</p>
        </div>
      </AuthLayout>
    )
  }

  if (step === 'recovery') {
    return (
      <AuthLayout title={t('totpRecoveryTitle')} subtitle={t('totpRecoveryHint')} iconName="lock" badgeText={t('mfaBadge')}>
        <ul className="auth-recovery">
          {recoveryCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <Button type="button" fullWidth onClick={() => navigate(staffHome())}>
          {t('totpRecoverySaved')}
        </Button>
      </AuthLayout>
    )
  }

  if (step === 'mfa') {
    return (
      <AuthLayout
        title={totpEnrollRequired ? t('totpSetupTitle') : t('labelTotpCode')}
        subtitle={totpEnrollRequired ? t('totpSetupHint') : t('totpPrompt')}
        iconName="lock"
        badgeText={t('mfaBadge')}
      >
        <form onSubmit={handleMfaSubmit} className="auth-form">
          {errorMessage && (
            <div className="auth-error-banner" role="alert">
              <Icon name="error" size="sm" />
              <span>{errorMessage}</span>
            </div>
          )}

          {qrDataUrl ? <img className="auth-qr" src={qrDataUrl} alt="" /> : null}

          <div className="auth-field">
            <label className="auth-label">{t('labelTotpCode')}</label>
            <PinInput
              value={totpCode}
              onChange={setTotpCode}
              disabled={loading}
              error={Boolean(errorMessage)}
              autoFocus
              mask={false}
              label={t('labelTotpCode')}
            />
            <span className="auth-helper">{t('totpPlaceholder')}</span>
          </div>

          {passwordChangeRequired && (
            <div className="auth-field">
              <label htmlFor="staff-new-pw" className="auth-label">
                {t('newPasswordRequired')}
              </label>
              <div className="auth-input-wrapper">
                <Icon name="vpn_key" size="sm" className="auth-input-icon" />
                <input
                  id="staff-new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="auth-input"
                  placeholder={t('newPasswordPlaceholder')}
                  required
                />
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading || totpCode.length !== 6} fullWidth aria-busy={loading}>
            {t('btnVerify')}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setStep('credentials')
              setTotpCode('')
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
      title={t('authStaffTitle')}
      subtitle={t('authStaffSubtitle')}
      iconName="admin_panel_settings"
      badgeText={t('staffPortal')}
    >
      <form onSubmit={handleCredentialsSubmit} className="auth-form">
        {errorMessage && (
          <div className="auth-error-banner" role="alert">
            <Icon name="error" size="sm" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="auth-field">
          <label htmlFor="staff-identifier" className="auth-label">
            {t('labelIdentifier')}
          </label>
          <div className="auth-input-wrapper">
            <Icon name="person" size="sm" className="auth-input-icon" />
            <input
              id="staff-identifier"
              type="text"
              autoComplete="username"
              placeholder={t('identifierPlaceholder')}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={`auth-input ${errorMessage && !identifier ? 'auth-input--error' : ''}`}
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="staff-password" className="auth-label">
            {t('labelPassword')}
          </label>
          <div className="auth-input-wrapper">
            <Icon name="lock" size="sm" className="auth-input-icon" />
            <input
              id="staff-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`auth-input auth-input--with-toggle ${errorMessage && !password ? 'auth-input--error' : ''}`}
              disabled={loading}
              required
            />
            <button
              type="button"
              className="auth-input-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('hidePassword') : t('showPassword')}
            >
              <Icon name={showPassword ? 'visibility_off' : 'visibility'} size="sm" />
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !identifier.trim() || !password}
          fullWidth
          aria-busy={loading}
        >
          {t('btnSignIn')}
        </Button>

        <div className="auth-links">
          <Link to="/auth/farmer" className="auth-link">
            {t('linkFarmerLogin')}
          </Link>
          <Link to="/auth/accept" className="auth-link">
            {copy.inviteHave}
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}

function staffHome(): string {
  const role = readAccessRole()
  if (role === 'local_admin') return '/local'
  if (role === 'regional_admin') return '/regional'
  if (role === 'distributor_staff') return '/distributor'
  return '/admin'
}