import { useEffect, useState } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { loadDistributors, type DistributorRow } from '../api'
import { AdminFrame } from '../components/AdminFrame'
import { matches, problem } from '../text'

export function DistributorsPage() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<DistributorRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadDistributors()
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
  const visible = (rows ?? []).filter((row) =>
    matches(needle, row.name, row.code, row.type === 'government' ? t.adminGovernment : t.adminPrivate),
  )

  return (
    <AdminFrame eyebrow={t.adminEyebrow} title={t.adminDistributors} hint={t.adminDistributorsHint} query={query} onQuery={setQuery}>
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
                  <th>{t.adminDistributors}</th>
                  <th>{t.adminCode}</th>
                  <th>{t.adminType}</th>
                  <th>{t.adminRegionsServed}</th>
                  <th>{t.adminStatus}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id}>
                    <td className="admin__strong">{row.name}</td>
                    <td>{row.code}</td>
                    <td>{row.type === 'government' ? t.adminGovernment : t.adminPrivate}</td>
                    <td>{row.regionCount}</td>
                    <td>
                      <span className={`admin__chip${row.status === 'suspended' ? ' admin__chip--stop' : ''}`}>
                        {row.status === 'active' ? t.adminActive : t.adminSuspended}
                      </span>
                    </td>
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
