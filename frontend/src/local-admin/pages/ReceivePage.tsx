import { useEffect, useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { StepUpForm } from '@/admin/components/StepUpForm'
import { loadIncoming, localWrite, type IncomingShipment } from '../api'
import { LocalFrame } from '../components/LocalFrame'
import { problem } from '../text'

export function ReceivePage() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<IncomingShipment[]>([])
  const [shipmentId, setShipmentId] = useState('')
  const [qty, setQty] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    void loadIncoming()
      .then((items) => {
        setRows(items)
        setShipmentId(items[0]?.id ?? '')
      })
      .catch((err: unknown) => setError(problem(err, t.errorGeneric)))
  }, [t.errorGeneric])

  const selected = rows.find((row) => row.id === shipmentId)

  return (
    <LocalFrame title={t.localReceive} hint={t.localReceiveHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error" role="alert">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      <section className="admin__card">
        <StepUpForm />
        {rows.length === 0 ? <p className="admin__empty">{t.localEmpty}</p> : null}
        <form
          className="admin__form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            if (!selected) return
            const noteText = String(new FormData(event.currentTarget).get('note') ?? '').trim()
            void localWrite(`/local-admin/shipments/${selected.id}/receive`, 'POST', {
              lines: selected.lines.map((line, index) => ({
                inputId: line.inputId,
                batchId: line.batchId,
                qtyKg: Number(qty[`${index}`] ?? line.qtyKg),
              })),
              note: noteText || undefined,
            })
              .then(() => setNote(t.localSaved))
              .catch((err: unknown) => setError(problem(err, t.errorGeneric)))
          }}
        >
          <label>
            {t.localShipment}
            <select value={shipmentId} onChange={(event) => setShipmentId(event.target.value)}>
              {rows.map((row) => (
                <option key={row.id} value={row.id}>{row.shipmentNo} · {row.status}</option>
              ))}
            </select>
          </label>
          {selected?.lines.map((line, index) => (
            <label key={`${line.batchId}-${index}`}>
              {line.inputId}
              <input
                type="number"
                min={0}
                value={qty[`${index}`] ?? String(line.qtyKg)}
                onChange={(event) => setQty((current) => ({ ...current, [`${index}`]: event.target.value }))}
              />
            </label>
          ))}
          <label>
            {t.localReason}
            <input name="note" />
          </label>
          <button className="admin__submit" type="submit" disabled={!selected}>{t.adminSave}</button>
        </form>
      </section>
    </LocalFrame>
  )
}
