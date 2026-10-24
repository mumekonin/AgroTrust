import { useEffect, useState } from 'react'
import { formatBirr } from '@/shared/format/quantity'
import { useLang } from '@/shared/i18n/LangContext'
import { StepUpForm } from '@/admin/components/StepUpForm'
import { loadQueue, localWrite, type QueueRow } from '../api'
import { LocalFrame } from '../components/LocalFrame'
import { matches, problem } from '../text'

export function PaymentsPage() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<QueueRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadQueue('ACCEPTED')
      .then((items) => {
        if (!cancelled) setRows(items)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(problem(err, t.errorGeneric))
        setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [tick, t.errorGeneric])

  const visible = (rows ?? []).filter((row) => matches(query.trim().toLowerCase(), row.requestNo))

  return (
    <LocalFrame title={t.localPay} hint={t.localPayHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error" role="alert">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      <section className="admin__card">
        <StepUpForm />
        {rows?.length === 0 ? <p className="admin__empty">{t.localEmpty}</p> : null}
        <ul className="admin__list">
          {visible.map((row) => (
            <li key={row.id}>
              <form
                className="admin__form"
                onSubmit={(event) => {
                  event.preventDefault()
                  const slipNo = String(new FormData(event.currentTarget).get('slipNo') ?? '').trim()
                  setError(null)
                  void localWrite(`/local-admin/input-requests/${row.id}/confirm-payment`, 'POST', { slipNo })
                    .then(() => {
                      setNote(t.localSaved)
                      setTick((value) => value + 1)
                    })
                    .catch((err: unknown) => setError(problem(err, t.errorGeneric)))
                }}
              >
                <strong>{row.requestNo}</strong>
                <span>{formatBirr(row.payableSantim)} {t.farmerBirr}</span>
                <label>
                  {t.localSlip}
                  <input name="slipNo" required />
                </label>
                <button className="admin__submit" type="submit">{t.adminSave}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </LocalFrame>
  )
}
