import { useEffect, useState } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { loadFarmers, type FarmerRow } from '../api'
import { AdminFrame } from '../components/AdminFrame'
import { matches, problem } from '../text'
import { adminWrite } from '../write'

export function FarmersPage() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<FarmerRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadFarmers()
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
  }, [tick, t.errorGeneric])

  const visible = (rows ?? []).filter((row) => matches(query.trim().toLowerCase(), row.fullName, row.registryId, row.status))

  async function save(work: () => Promise<string | void>) {
    setError(null)
    setNote(null)
    try {
      setNote((await work()) || t.adminSaved)
      setTick((value) => value + 1)
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  return (
    <AdminFrame eyebrow={t.adminEyebrow} title={t.adminFarmers} hint={t.adminFarmersHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      <section className="admin__card">
        {rows?.length === 0 ? <p className="admin__empty">{t.adminEmpty}</p> : null}
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>{t.adminFarmers}</th>
                <th>{t.adminCode}</th>
                <th>{t.adminStatus}</th>
                <th>{t.adminLand}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td className="admin__strong">{row.fullName}</td>
                  <td>{row.registryId}</td>
                  <td>{row.status}</td>
                  <td>{row.landHoldingHa}</td>
                  <td>
                    <button type="button" className="admin__text-btn" onClick={() => void save(() => adminWrite(`/local-admin/farmers/${row.id}/verify`, 'PATCH').then(() => undefined))}>
                      {t.adminVerify}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminFrame>
  )
}
