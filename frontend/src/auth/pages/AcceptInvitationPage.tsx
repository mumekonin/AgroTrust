import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/shared/api/client'
import { useLang } from '@/shared/i18n/LangContext'
import { Button } from '@/shared/ui/Button'
import { Icon } from '@/shared/ui/Icon'
import { acceptInvitation } from '../api'
import { AuthLayout } from '../components/AuthLayout'

export function AcceptInvitationPage() {
  const { t } = useLang()
  const [token, setToken] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await acceptInvitation({ token, code, password })
      setDone(true)
      setPassword('')
      setCode('')
      setToken('')
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.problem.title : t.errorGeneric)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t.inviteAcceptTitle} subtitle={t.inviteAcceptHint} iconName="badge" badgeText={t.staffPortal}>
      {done ? (
        <div className="auth-success">
          <p className="auth-success__title">{t.inviteAccepted}</p>
          <Link to="/auth/staff" className="at-btn at-btn--primary at-btn--full-width">
            {t.authStaffTitle}
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          {error ? (
            <div className="auth-error-banner" role="alert">
              <Icon name="error" size="sm" />
              <span>{error}</span>
            </div>
          ) : null}
          <div className="auth-field">
            <label className="auth-label" htmlFor="invite-token">{t.inviteToken}</label>
            <div className="auth-input-wrapper">
              <Icon name="badge" size="sm" className="auth-input-icon" />
              <input id="invite-token" className="auth-input" value={token} onChange={(event) => setToken(event.target.value)} required />
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="invite-code">{t.inviteSmsCode}</label>
            <div className="auth-input-wrapper">
              <Icon name="sms" size="sm" className="auth-input-icon" />
              <input id="invite-code" className="auth-input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required />
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="invite-password">{t.invitePassword}</label>
            <div className="auth-input-wrapper">
              <Icon name="lock" size="sm" className="auth-input-icon" />
              <input id="invite-password" className="auth-input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            <p className="auth-helper">{t.invitePasswordHint}</p>
          </div>
          <Button type="submit" fullWidth disabled={loading} aria-busy={loading}>
            {t.inviteAccept}
          </Button>
          <div className="auth-links">
            <Link to="/auth/staff" className="auth-link">{t.authStaffTitle}</Link>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
