import { useState, type FormEvent } from 'react'
import { formatKg } from '@/shared/format/quantity'
import { useLang } from '@/shared/i18n/LangContext'
import { StepUpForm } from '@/admin/components/StepUpForm'
import { localWrite } from '../api'
import { LocalFrame } from '../components/LocalFrame'
import { problem } from '../text'

interface Checked {
  requestId: string
  requestNo: string
  fullName: string
  items: Array<{ qtyKg: number }>
}

export function PickupPage() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [checked, setChecked] = useState<Checked | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  return (
    <LocalFrame title={t.localPickup} hint={t.localPickupHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error" role="alert">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      <section className="admin__card">
        <StepUpForm />
        <form
          className="admin__form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const requestNo = String(form.get('requestNo') ?? '').trim()
            const entered = String(form.get('code') ?? '').trim()
            setError(null)
            void localWrite<Checked>('/local-admin/pickups/verify', 'POST', { requestNo, code: entered })
              .then((result) => {
                setChecked(result)
                setCode(entered)
              })
              .catch((err: unknown) => setError(problem(err, t.errorGeneric)))
          }}
        >
          <label>
            {t.localQueue}
            <input name="requestNo" required />
          </label>
          <label>
            {t.localSmsCode}
            <input name="code" minLength={8} maxLength={8} autoComplete="off" required />
          </label>
          <button className="admin__submit" type="submit">{t.localVerifyPickup}</button>
        </form>
        {checked ? (
          <div>
            <p className="admin__note">{checked.fullName} · {checked.requestNo}</p>
            <ul className="admin__list">
              {checked.items.map((item, index) => (
                <li key={index}>{formatKg(item.qtyKg)} kg</li>
              ))}
            </ul>
            <button
              type="button"
              className="admin__submit"
              onClick={() => {
                void localWrite(`/local-admin/pickups/${checked.requestId}/complete`, 'POST', { code })
                  .then(() => {
                    setNote(t.localHandover)
                    setChecked(null)
                    setCode('')
                  })
                  .catch((err: unknown) => setError(problem(err, t.errorGeneric)))
              }}
            >
              {t.localHandover}
            </button>
          </div>
        ) : null}
      </section>
    </LocalFrame>
  )
}
