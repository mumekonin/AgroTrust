import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from '@/shared/i18n/LangContext'
import { AuthLayout } from '../components/AuthLayout'
import { PinInput } from '../components/PinInput'
import { Button } from '@/shared/ui/Button'
import { Icon } from '@/shared/ui/Icon'
import { activateFarmer } from '../api'
import { ApiError } from '@/shared/api/client'

export function ActivationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Form values
  const [phone, setPhone] = useState('')
  const [activationCode, setActivationCode] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone || normalizedPhone.length < 10) {
      setErrorMessage(t('errorInvalidPhone'))
      return
    }

    const code = activationCode.trim().toUpperCase()
    if (code.length !== 8) {
      setErrorMessage(t('activationCodeInvalid'))
      return
    }

    if (pin.length !== 6) {
      setErrorMessage(t('errorPinLength'))
      return
    }

    if (pin !== confirmPin) {
      setErrorMessage(t('errorPinMismatch'))
      return
    }

    setLoading(true)
    try {
      await activateFarmer({
        phone: normalizedPhone,
        activationCode: code,
        pin,
      })
      setSuccess(true)
      setTimeout(() => navigate('/farmer'), 1000)
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

  if (success) {
    return (
      <AuthLayout
        title={t('accountActivated')}
        iconName="check_circle"
        badgeText={t('kebeleBadge')}
      >
        <div className="auth-success">
          <p className="auth-success__title">{t('signedIn')}</p>
          <p className="auth-success__body">{t('openingFarmer')}</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('authActivateTitle')}
      subtitle={t('authActivateSubtitle')}
      iconName="badge"
      badgeText={t('kebeleBadge')}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        {/* Kebele verification reminder banner */}
        <div className="auth-callout">
          <Icon name="info" size="sm" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{t('activateNote')}</span>
        </div>

        {errorMessage && (
          <div className="auth-error-banner" role="alert">
            <Icon name="error" size="sm" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Phone input */}
        <div className="auth-field">
          <label htmlFor="activate-phone" className="auth-label">
            {t('labelPhone')}
          </label>
          <div className="auth-input-wrapper">
            <Icon name="phone" size="sm" className="auth-input-icon" />
            <input
              id="activate-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t('phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="auth-input"
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Activation Code (8 characters) */}
        <div className="auth-field">
          <label htmlFor="activation-code" className="auth-label">
            {t('labelActivationCode')}
          </label>
          <div className="auth-input-wrapper">
            <Icon name="key" size="sm" className="auth-input-icon" />
            <input
              id="activation-code"
              type="text"
              maxLength={8}
              autoCapitalize="characters"
              placeholder={t('activationCodePlaceholder')}
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
              className="auth-input"
              style={{ letterSpacing: '0.12em', fontWeight: 600 }}
              disabled={loading}
              required
            />
          </div>
          <span className="auth-helper">{t('activationCodeHelper')}</span>
        </div>

        {/* Set 6-digit PIN */}
        <div className="auth-field">
          <label className="auth-label">{t('labelNewPin')}</label>
          <PinInput
            value={pin}
            onChange={setPin}
            disabled={loading}
            error={Boolean(errorMessage && pin.length < 6)}
          />
        </div>

        {/* Confirm PIN */}
        <div className="auth-field">
          <label className="auth-label">{t('labelConfirmPin')}</label>
          <PinInput
            value={confirmPin}
            onChange={setConfirmPin}
            disabled={loading}
            error={Boolean(errorMessage && confirmPin.length > 0 && pin !== confirmPin)}
          />
          <span className="auth-helper">{t('confirmPinHelper')}</span>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={
            loading ||
            !phone ||
            activationCode.trim().length !== 8 ||
            pin.length !== 6 ||
            confirmPin.length !== 6
          }
          fullWidth
        >
          {loading ? t('btnActivate') + '...' : t('btnActivate')}
        </Button>

        {/* Footer links */}
        <div className="auth-links">
          <Link to="/auth/farmer" className="auth-link">
            {t('linkFarmerLogin')}
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
