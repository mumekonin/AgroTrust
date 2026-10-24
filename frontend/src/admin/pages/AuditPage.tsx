import { useEffect, useState } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { loadAudit, type AuditRow } from '../api'
import { AdminFrame } from '../components/AdminFrame'
import { matches, problem, when } from '../text'

export function AuditPage() {
  const { locale, t } = useLang()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<AuditRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadAudit()
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

  const needle = query.trim().toLowerCase()
  const visible = (rows ?? []).filter((row) => matches(needle, row.action, row.entityType))

  return (
    <AdminFrame eyebrow={t.adminEyebrow} title={t.adminAudit} hint={t.adminAuditHint} query={query} onQuery={setQuery}>
      {error ? (
        <p className="admin__error" role="alert">
          {error}
        </p>
      ) : null}
      {rows === null ? <p className="admin__empty">{t.farmerLoading}</p> : null}
      <section className="admin__card">
        {rows?.length === 0 ? <p className="admin__empty">{t.adminEmpty}</p> : null}
        {visible.length > 0 ? (
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>{t.adminAction}</th>
                  <th>{t.adminRecord}</th>
                  <th>{t.adminWhen}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.seq}>
                    <td className="admin__strong">{row.action}</td>
                    <td>{row.entityType}</td>
                    <td>{when(row.at, locale)}</td>
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
