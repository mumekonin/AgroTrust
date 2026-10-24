import { useEffect, useState, type FormEvent } from 'react'
import { formatKg } from '@/shared/format/quantity'
import { useLang } from '@/shared/i18n/LangContext'
import { StepUpForm } from '@/admin/components/StepUpForm'
import { loadCenterOptions, loadSeasonOptions, localWrite, type NamedOption } from '../api'
import { LocalFrame } from '../components/LocalFrame'
import { problem } from '../text'

interface Preview {
  requestCount: number
  lines: Array<{ inputId: string; requestedKg: number }>
}

interface Created {
  id: string
  requisitionNo: string
  status: string
}

export function RequisitionsPage() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [seasons, setSeasons] = useState<NamedOption[]>([])
  const [centers, setCenters] = useState<NamedOption[]>([])
  const [seasonId, setSeasonId] = useState('')
  const [centerId, setCenterId] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [created, setCreated] = useState<Created | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([loadSeasonOptions().catch(() => []), loadCenterOptions().catch(() => [])]).then(([seasonRows, centerRows]) => {
      setSeasons(seasonRows)
      setCenters(centerRows)
      setSeasonId(seasonRows[0]?.id ?? '')
      setCenterId(centerRows[0]?.id ?? '')
    })
  }, [])

  async function run(work: () => Promise<void>) {
    setError(null)
    setNote(null)
    try {
      await work()
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  return (
    <LocalFrame title={t.localRequisitions} hint={t.localRequisitionsHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error" role="alert">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      {created ? (
        <p className="admin__note">
          {created.requisitionNo} · {created.status} · <strong>{created.id}</strong>
        </p>
      ) : null}
      <section className="admin__card">
        <StepUpForm />
        <form
          className="admin__form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const body = {
              seasonId,
              localCenterId: centerId,
              inputCategory: String(form.get('inputCategory')),
              preview: form.get('preview') === 'on',
            }
            void run(async () => {
              if (body.preview) {
                setPreview(await localWrite<Preview>('/local-admin/requisitions', 'POST', body))
                setCreated(null)
                return
              }
              const saved = await localWrite<Created>('/local-admin/requisitions', 'POST', body)
              setCreated(saved)
              setPreview(null)
              setNote(t.localSaved)
            })
          }}
        >
          <label>
            {t.adminSeasons}
            <select required value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>
              {seasons.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
            </select>
          </label>
          <label>
            {t.adminCenters}
            <select required value={centerId} onChange={(event) => setCenterId(event.target.value)}>
              {centers.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
            </select>
          </label>
          <label>
            {t.adminType}
            <select name="inputCategory" defaultValue="fertilizer">
              <option value="fertilizer">fertilizer</option>
              <option value="seed">seed</option>
              <option value="agrochemical">agrochemical</option>
            </select>
          </label>
          <label className="admin__check">
            <input name="preview" type="checkbox" />
            {t.localPreview}
          </label>
          <button className="admin__submit" type="submit">{t.adminSave}</button>
        </form>
        {preview ? (
          <ul className="admin__list">
            <li>{t.adminRequestCount}: {preview.requestCount}</li>
            {preview.lines.map((line) => (
              <li key={line.inputId}>{line.inputId} · {formatKg(line.requestedKg)} kg</li>
            ))}
          </ul>
        ) : null}
        {created && created.status === 'DRAFT' ? (
          <button
            type="button"
            className="admin__submit"
            onClick={() => void run(async () => {
              await localWrite(`/local-admin/requisitions/${created.id}/submit`, 'POST', {})
              setNote(t.localSubmitReq)
              setCreated({ ...created, status: 'SUBMITTED' })
            })}
          >
            {t.localSubmitReq}
          </button>
        ) : null}
      </section>
    </LocalFrame>
  )
}
