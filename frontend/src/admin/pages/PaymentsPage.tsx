import { useEffect, useState } from 'react'
import { formatBirr } from '@/shared/format/quantity'
import { useLang } from '@/shared/i18n/LangContext'
import { loadPayments, type PaymentRow } from '../api'
import { AdminFrame } from '../components/AdminFrame'
import { matches, problem, when } from '../text'

export function PaymentsPage() {
  const { locale, t } = useLang()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<PaymentRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadPayments()
      .then((page) => {
        if (!cancelled) setRows(page.items)
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

  const visible = (rows ?? []).filter((row) => matches(query.trim().toLowerCase(), row.paymentNo, row.status))

  return (
    <AdminFrame eyebrow={t.adminEyebrow} title={t.adminPayments} hint={t.adminPaymentsHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error">{error}</p> : null}
      {rows === null ? <p className="admin__empty">{t.farmerLoading}</p> : null}
      <section className="admin__card">
        {rows?.length === 0 ? <p className="admin__empty">{t.adminEmpty}</p> : null}
        {visible.length > 0 ? (
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>{t.adminPayments}</th>
                  <th>{t.adminBirr}</th>
                  <th>{t.adminStatus}</th>
                  <th>{t.adminWhen}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id}>
                    <td className="admin__strong">{row.paymentNo}</td>
                    <td>ETB {formatBirr(row.amountSantim)}</td>
                    <td>{row.status}</td>
                    <td>{when(row.confirmedAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </AdminFrame>
  )
}
