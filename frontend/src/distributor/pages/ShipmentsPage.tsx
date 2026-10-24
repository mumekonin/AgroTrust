import { useEffect, useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { LanguageSwitch } from '@/shared/ui/LanguageSwitch'
import { loadInputOptions, loadSeasonOptions, type NamedOption } from '@/local-admin/api'
import { distWrite } from '../api'
import { problem } from '../text'
import '@/admin/pages/NationalAdminPage.css'

function iso(value: string): string {
  return new Date(value).toISOString()
}

export function ShipmentsPage() {
  const { t } = useLang()
  const [seasons, setSeasons] = useState<NamedOption[]>([])
  const [seasonId, setSeasonId] = useState('')
  const [inputs, setInputs] = useState<NamedOption[]>([])
  const [inputId, setInputId] = useState('')
  const [batchId, setBatchId] = useState<string | null>(null)
  const [shipmentId, setShipmentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    void loadSeasonOptions().then((rows) => {
      setSeasons(rows)
      setSeasonId(rows[0]?.id ?? '')
    }).catch(() => setSeasons([]))
  }, [])

  useEffect(() => {
    if (!seasonId) return
    void loadInputOptions(seasonId)
      .then((rows) => {
        setInputs(rows)
        setInputId(rows[0]?.id ?? '')
      })
      .catch(() => {
        setInputs([])
        setInputId('')
      })
  }, [seasonId])

  async function run(work: () => Promise<void>) {
    setError(null)
    setNote(null)
    try {
      await work()
      setNote(t.localSaved)
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  return (
    <main className="admin__main">
      <div className="admin__top">
        <span />
        <LanguageSwitch tone="light" />
        <div className="admin__who">
          <span className="admin__avatar" aria-hidden>DS</span>
          <span><strong>{t.distRole}</strong><small>{t.distOversight}</small></span>
        </div>
      </div>
      <header className="admin__head">
        <div>
          <h1 className="admin__title">{t.distShipments}</h1>
          <p className="admin__hint">{t.distShipmentsHint}</p>
        </div>
      </header>
      {error ? <p className="admin__error" role="alert">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      {batchId ? <p className="admin__note">{t.localBatch} <strong>{batchId}</strong></p> : null}
      {shipmentId ? <p className="admin__note">{t.localShipment} <strong>{shipmentId}</strong></p> : null}
      <section className="admin__card">
        <form
          className="admin__form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            void run(async () => {
              const created = await distWrite<{ id: string }>('/distributor/batches', 'POST', {
                lotNumber: String(form.get('lotNumber') ?? '').trim(),
                inputId,
                seasonId,
                quantityKg: Number(form.get('quantityKg')),
                source: String(form.get('source') ?? '').trim(),
              })
              setBatchId(created.id)
            })
          }}
        >
          <h2>{t.localBatch}</h2>
          <label>
            {t.adminSeasons}
            <select value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>
              {seasons.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
            </select>
          </label>
          <label>
            {t.localInput}
            <select required value={inputId} onChange={(event) => setInputId(event.target.value)}>
              {inputs.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
            </select>
          </label>
          <label>{t.localLot}<input name="lotNumber" required /></label>
          <label>{t.localQty}<input name="quantityKg" type="number" min={1} required /></label>
          <label>{t.localSource}<input name="source" required /></label>
          <button className="admin__submit" type="submit">{t.adminSave}</button>
        </form>
        <form
          className="admin__form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            void run(async () => {
              const created = await distWrite<{ id: string }>('/distributor/shipments', 'POST', {
                requisitionId: String(form.get('requisitionId') ?? '').trim(),
                etaAt: iso(String(form.get('etaAt') ?? '')),
                transport: {
                  vehiclePlate: String(form.get('vehiclePlate') ?? '').trim(),
                  driverName: String(form.get('driverName') ?? '').trim(),
                  driverPhone: String(form.get('driverPhone') ?? '').trim(),
                },
                lines: [{
                  inputId,
                  batchId: String(form.get('batchId') ?? batchId ?? '').trim(),
                  qtyKg: Number(form.get('qtyKg')),
                }],
              })
              setShipmentId(created.id)
            })
          }}
        >
          <h2>{t.localShipment}</h2>
          <label>{t.localRequisitions}<input name="requisitionId" required defaultValue="" /></label>
          <label>{t.localEta}<input name="etaAt" type="datetime-local" required /></label>
          <label>{t.localPlate}<input name="vehiclePlate" required /></label>
          <label>{t.localDriver}<input name="driverName" required /></label>
          <label>{t.localDriverPhone}<input name="driverPhone" required /></label>
          <label>
            {t.localInput}
            <select required value={inputId} onChange={(event) => setInputId(event.target.value)}>
              {inputs.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
            </select>
          </label>
          <label>{t.localBatch}<input name="batchId" required defaultValue={batchId ?? ''} key={batchId ?? 'none'} /></label>
          <label>{t.localQty}<input name="qtyKg" type="number" min={1} required /></label>
          <button className="admin__submit" type="submit">{t.adminSave}</button>
        </form>
        <form
          className="admin__form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const id = String(form.get('id') ?? shipmentId ?? '').trim()
            void run(() => distWrite(`/distributor/shipments/${id}`, 'PATCH', { etaAt: iso(String(form.get('etaAt') ?? '')) }).then(() => undefined))
          }}
        >
          <h2>{t.localTrack}</h2>
          <label>{t.localShipment}<input name="id" required defaultValue={shipmentId ?? ''} key={shipmentId ?? 'ship'} /></label>
          <label>{t.localEta}<input name="etaAt" type="datetime-local" required /></label>
          <button className="admin__submit" type="submit">{t.adminSave}</button>
        </form>
      </section>
    </main>
  )
}
