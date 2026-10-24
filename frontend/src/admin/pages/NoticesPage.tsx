import { useEffect, useState } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { loadNotices, type NoticeRow } from '../api'
import { AdminFrame } from '../components/AdminFrame'
import { matches, problem, when } from '../text'

export function NoticesPage() {
  const { locale, t } = useLang()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<NoticeRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadNotices()
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

  const visible = (rows ?? []).filter((row) => matches(query.trim().toLowerCase(), row.event, row.status, row.language))

  return (
    <AdminFrame eyebrow={t.adminEyebrow} title={t.adminNotifications} hint={t.adminNotificationsHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error">{error}</p> : null}
      {rows === null ? <p className="admin__empty">{t.farmerLoading}</p> : null}
      <section className="admin__card">
        {rows?.length === 0 ? <p className="admin__empty">{t.adminEmpty}</p> : null}
        {visible.length > 0 ? (
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>{t.adminNotifications}</th>
                  <th>{t.adminStatus}</th>
                  <th>{t.adminWhen}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id}>
                    <td className="admin__strong">{row.event}</td>
                    <td>{row.status}</td>
                    <td>{when(row.createdAt, locale)}</td>
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
