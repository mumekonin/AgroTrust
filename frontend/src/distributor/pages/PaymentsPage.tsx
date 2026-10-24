import { useEffect, useState } from 'react'
import { formatBirr } from '@/shared/format/quantity'
import { useLang } from '@/shared/i18n/LangContext'
import { LanguageSwitch } from '@/shared/ui/LanguageSwitch'
import { loadDistributorPayments, type PaymentLine } from '../api'
import { problem } from '../text'
import '@/admin/pages/NationalAdminPage.css'

export function PaymentsPage() {
  const { t } = useLang()
  const [rows, setRows] = useState<PaymentLine[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadDistributorPayments()
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
          <h1 className="admin__title">{t.distPayments}</h1>
          <p className="admin__hint">{t.distPaymentsHint}</p>
        </div>
      </header>
      {error ? <p className="admin__error" role="alert">{error}</p> : null}
      <section className="admin__card">
        {rows?.length === 0 ? <p className="admin__empty">{t.localEmpty}</p> : null}
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>{t.distPayments}</th>
                <th>{t.farmerBirr}</th>
                <th>{t.localStatus}</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((row) => (
                <tr key={row.id}>
                  <td className="admin__strong">{row.paymentNo}</td>
                  <td>{formatBirr(row.amountSantim)}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
