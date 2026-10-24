import { useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { loadRequisition } from '../api'
import { AdminFrame } from '../components/AdminFrame'
import { StepUpForm } from '../components/StepUpForm'
import { problem } from '../text'
import { adminWrite } from '../write'

export function OperationsPage() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  async function save(work: () => Promise<string | void>) {
    setError(null)
    setNote(null)
    try {
      setNote((await work()) || t.adminSaved)
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  return (
    <AdminFrame eyebrow={t.adminEyebrow} title={t.adminOperations} hint={t.adminOperationsHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      <section className="admin__card"><StepUpForm /></section>
      <div className="admin__split">
        <section className="admin__card">
          <form className="admin__form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const id = String(new FormData(event.currentTarget).get('id') ?? '').trim()
            void save(async () => {
              const row = await loadRequisition(id)
              const kg = row.lines.reduce((sum, line) => sum + line.requestedKg, 0)
              return `${row.requisitionNo} · ${row.status} · ${row.requestCount} · ${kg} kg`
            })
          }}>
            <h2>{t.adminLookupRequisition}</h2>
            <label>{t.adminRequisitionId}<input name="id" required /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
          <form className="admin__form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const id = String(form.get('id') ?? '').trim()
            void save(() => adminWrite(`/admin/shipments/${id}/resolve-discrepancy`, 'POST', {
              resolution: String(form.get('resolution') ?? '').trim(),
            }).then(() => undefined))
          }}>
            <h2>{t.adminResolveShipment}</h2>
            <label>{t.adminShipmentId}<input name="id" required /></label>
            <label>{t.adminReason}<input name="resolution" required /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </section>
        <section className="admin__card">
          <form className="admin__form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const id = String(new FormData(event.currentTarget).get('id') ?? '').trim()
            void save(() => adminWrite(`/admin/overrides/${id}/approve`, 'POST', {}).then(() => undefined))
          }}>
            <h2>{t.adminApproveOverride}</h2>
            <label>{t.adminOverrideId}<input name="id" required /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </section>
      </div>
    </AdminFrame>
  )
}
