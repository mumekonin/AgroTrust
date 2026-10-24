import { useEffect, useState } from 'react'
import { formatBirr, formatKg } from '@/shared/format/quantity'
import { useLang } from '@/shared/i18n/LangContext'
import { loadQueue, localWrite, type QueueRow } from '../api'
import { LocalFrame } from '../components/LocalFrame'
import { matches, problem } from '../text'

const FILTERS = ['', 'SUBMITTED', 'APPROVED', 'ACCEPTED', 'PAID', 'READY_FOR_PICKUP'] as const

export function QueuePage() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('SUBMITTED')
  const [rows, setRows] = useState<QueueRow[] | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadQueue(filter || undefined)
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
  }, [filter, tick, t.errorGeneric])

  const visible = (rows ?? []).filter((row) => matches(query.trim().toLowerCase(), row.requestNo, row.status))

  async function act(work: () => Promise<void>) {
    setError(null)
    setNote(null)
    try {
      await work()
      setNote(t.localSaved)
      setTick((value) => value + 1)
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  return (
    <LocalFrame
      title={t.localQueue}
      hint={t.localQueueHint}
      query={query}
      onQuery={setQuery}
      extra={
        <div className="admin__filters" role="group" aria-label={t.localStatus}>
          {FILTERS.map((value) => (
            <button key={value || 'all'} type="button" className={filter === value ? 'is-selected' : undefined} onClick={() => setFilter(value)}>
              {value || t.localAll}
            </button>
          ))}
        </div>
      }
    >
      {error ? <p className="admin__error" role="alert">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      <section className="admin__card">
        <label>
          {t.localReason}
          <input value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        {rows?.length === 0 ? <p className="admin__empty">{t.localEmpty}</p> : null}
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>{t.localQueue}</th>
                <th>{t.localStatus}</th>
                <th>{t.localQty}</th>
                <th>{t.farmerBirr}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td className="admin__strong">{row.requestNo}</td>
                  <td>{row.status}</td>
                  <td>{formatKg(row.qtyKg)}</td>
                  <td>{formatBirr(row.payableSantim)}</td>
                  <td>
                    {row.status === 'SUBMITTED' ? (
                      <>
                        <button type="button" className="admin__text-btn" onClick={() => void act(() => localWrite(`/local-admin/input-requests/${row.id}/approve`, 'POST', {}).then(() => undefined))}>
                          {t.localApprove}
                        </button>
                        <button
                          type="button"
                          className="admin__text-btn"
                          onClick={() => void act(() => localWrite(`/local-admin/input-requests/${row.id}/reject`, 'POST', { reason }).then(() => undefined))}
                        >
                          {t.localReject}
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </LocalFrame>
  )
}
