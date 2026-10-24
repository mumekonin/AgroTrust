import { useEffect, useState, type FormEvent } from 'react'
import { formatKg } from '@/shared/format/quantity'
import { useLang } from '@/shared/i18n/LangContext'
import { Icon } from '@/shared/ui/Icon'
import { LanguageSwitch } from '@/shared/ui/LanguageSwitch'
import { StepUpForm } from '@/admin/components/StepUpForm'
import { distWrite, loadRequisitionDetail, loadRequisitions, type EligibilityRow, type RequisitionRow } from '../api'
import { problem } from '../text'
import '@/admin/pages/NationalAdminPage.css'

export function RequisitionsPage() {
  const { t } = useLang()
  const [rows, setRows] = useState<RequisitionRow[] | null>(null)
  const [selected, setSelected] = useState<string>('')
  const [lines, setLines] = useState<RequisitionRow['lines']>([])
  const [farmers, setFarmers] = useState<EligibilityRow[]>([])
  const [accepted, setAccepted] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadRequisitions()
      .then((items) => {
        if (cancelled) return
        setRows(items)
        setSelected((current) => current || items[0]?.id || '')
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(problem(err, t.errorGeneric))
      })
    return () => {
      cancelled = true
    }
  }, [t.errorGeneric, tick])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    loadRequisitionDetail(selected)
      .then((detail) => {
        if (cancelled) return
        setLines(detail.lines)
        setFarmers(detail.farmers)
        const next: Record<string, string> = {}
        for (const line of detail.lines) next[line.inputId] = String(line.requestedKg)
        setAccepted(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(problem(err, t.errorGeneric))
      })
    return () => {
      cancelled = true
    }
  }, [selected, t.errorGeneric])

  return (
    <main className="admin__main">
      <div className="admin__top">
        <span />
        <LanguageSwitch tone="light" />
        <div className="admin__who">
          <span className="admin__avatar" aria-hidden>DS</span>
          <span>
            <strong>{t.distRole}</strong>
            <small>{t.distOversight}</small>
          </span>
        </div>
      </div>
      <header className="admin__head">
        <div>
          <p className="admin__eyebrow">{t.distOversight}</p>
          <h1 className="admin__title">{t.distRequisitions}</h1>
          <p className="admin__hint">{t.distRequisitionsHint}</p>
        </div>
      </header>
      {error ? <p className="admin__error" role="alert">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      <section className="admin__card">
        {rows?.length === 0 ? <p className="admin__empty">{t.localEmpty}</p> : null}
        <div className="admin__filters" role="group">
          {(rows ?? []).map((row) => (
            <button key={row.id} type="button" className={selected === row.id ? 'is-selected' : undefined} onClick={() => setSelected(row.id)}>
              {row.requisitionNo} · {row.status}
            </button>
          ))}
        </div>
        <ul className="admin__list">
          {farmers.map((farmer) => (
            <li key={farmer.requestNo}>
              <strong>{farmer.fullName}</strong>
              <small>{farmer.registryId} · {farmer.requestNo}</small>
              <small>
                {farmer.eligibility.verified ? t.localVerified : t.localPending}
                {' · '}
                {farmer.eligibility.paid ? t.adminPaid : t.localPay}
              </small>
            </li>
          ))}
        </ul>
        <StepUpForm />
        <form
          className="admin__form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const reason = String(new FormData(event.currentTarget).get('reason') ?? '').trim()
            void distWrite(`/distributor/requisitions/${selected}/respond`, 'POST', {
              lines: lines.map((line) => ({
                inputId: line.inputId,
                acceptedKg: Number(accepted[line.inputId] ?? 0),
              })),
              reason: reason || undefined,
            })
              .then(() => {
                setNote(t.localSaved)
                setTick((value) => value + 1)
              })
              .catch((err: unknown) => setError(problem(err, t.errorGeneric)))
          }}
        >
          {lines.map((line) => (
            <label key={line.inputId}>
              {t.distAccepted} · {formatKg(line.requestedKg)} kg
              <input
                type="number"
                min={0}
                value={accepted[line.inputId] ?? ''}
                onChange={(event) => setAccepted((current) => ({ ...current, [line.inputId]: event.target.value }))}
              />
            </label>
          ))}
          <label>
            {t.localReason}
            <input name="reason" />
          </label>
          <button className="admin__submit" type="submit" disabled={!selected}>{t.distRespond}</button>
        </form>
        <p className="admin__hint"><Icon name="verified_user" size="sm" /> {t.distRequisitionsHint}</p>
      </section>
    </main>
  )
}
