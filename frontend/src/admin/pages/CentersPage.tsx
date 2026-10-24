import { useEffect, useMemo, useState } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { loadCenters, loadRegions, type CenterRow, type GeoRow } from '../api'
import { AdminFrame } from '../components/AdminFrame'
import { CenterActions } from '../components/CenterActions'
import { localized, matches, problem } from '../text'

export function CentersPage() {
  const { locale, t } = useLang()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<CenterRow[] | null>(null)
  const [places, setPlaces] = useState<GeoRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([loadCenters(), loadRegions()]).then(([centerPage, placePage]) => {
      if (cancelled) return
      const failed = [centerPage, placePage].find((result) => result.status === 'rejected')
      setError(failed && failed.status === 'rejected' ? problem(failed.reason, t.errorGeneric) : null)
      setRows(centerPage.status === 'fulfilled' ? centerPage.value.items : [])
      setPlaces(placePage.status === 'fulfilled' ? placePage.value.items : [])
    })
    return () => {
      cancelled = true
    }
  }, [t.errorGeneric, tick])

  const placeById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places])
  const needle = query.trim().toLowerCase()
  const visible = (rows ?? []).filter((row) => {
    const region = placeById.get(row.regionId)
    return matches(needle, row.name, row.code, row.address, region ? localized(region.name, locale) : '')
  })

  return (
    <AdminFrame eyebrow={t.adminEyebrow} title={t.adminCenters} hint={t.adminCentersHint} query={query} onQuery={setQuery}>
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
                  <th>{t.adminCenters}</th>
                  <th>{t.adminCode}</th>
                  <th>{t.adminColRegion}</th>
                  <th>{t.adminKebeles}</th>
                  <th>{t.adminAddress}</th>
                  <th>{t.adminHours}</th>
                  <th>{t.adminStatus}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const region = placeById.get(row.regionId)
                  return (
                    <tr key={row.id}>
                      <td className="admin__strong">
                        {row.name}
                        <small>{row.id}</small>
                      </td>
                      <td>{row.code}</td>
                      <td>{region ? localized(region.name, locale) : t.adminUnknown}</td>
                      <td>{row.kebeleCount}</td>
                      <td>{row.address}</td>
                      <td>{row.openingHours}</td>
                      <td>
                        <span className={`admin__chip${row.status === 'suspended' ? ' admin__chip--stop' : ''}`}>
                          {row.status === 'active' ? t.adminActive : t.adminSuspended}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
      <CenterActions onSaved={() => setTick((value) => value + 1)} />
    </AdminFrame>
  )
}
