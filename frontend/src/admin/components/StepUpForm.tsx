import { useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { problem } from '../text'
import { confirmStepUp } from '../write'

export function StepUpForm() {
  const { t } = useLang()
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await confirmStepUp(password, code)
      setPassword('')
      setCode('')
      setSaved(true)
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="admin__form" onSubmit={(event) => void submit(event)}>
      <h2>{t.adminStepUp}</h2>
      <p className="admin__hint">{t.adminStepUpHint}</p>
      <label>
        {t.adminPassword}
        <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </label>
      <label>
        {t.adminAuthenticator}
        <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required />
      </label>
      {error ? <p className="admin__error">{error}</p> : null}
      {saved ? <p className="admin__note">{t.adminStepUpSaved}</p> : null}
      <button className="admin__submit" type="submit" disabled={busy}>
        {t.adminConfirm}
      </button>
    </form>
  )
}
