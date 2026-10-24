import { useEffect, useState } from 'react'
import { formatKg } from '@/shared/format/quantity'
import { useLang } from '@/shared/i18n/LangContext'
import { loadStock, type StockLine } from '../api'
import { LocalFrame } from '../components/LocalFrame'
import { matches, problem } from '../text'

export function StockPage() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<StockLine[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadStock()
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
  }, [t.errorGeneric])

  const visible = (rows ?? []).filter((row) => matches(query.trim().toLowerCase(), row.inputId, row.seasonId))

  return (
    <LocalFrame title={t.localStock} hint={t.localStockHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error" role="alert">{error}</p> : null}
      <section className="admin__card">
        {rows?.length === 0 ? <p className="admin__empty">{t.localEmpty}</p> : null}
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>{t.localInput}</th>
                <th>{t.localOnHand}</th>
                <th>{t.localReserved}</th>
                <th>{t.localAvailable}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={`${row.seasonId}-${row.inputId}`}>
                  <td className="admin__strong">{row.inputId}</td>
                  <td>{formatKg(row.onHandKg)}</td>
                  <td>{formatKg(row.reservedKg)}</td>
                  <td>{formatKg(row.availableKg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </LocalFrame>
  )
}
