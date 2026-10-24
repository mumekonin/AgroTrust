import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatKg, formatQuintal } from '@/shared/format/quantity'
import { useLang } from '@/shared/i18n/LangContext'
import { Icon } from '@/shared/ui/Icon'
import {
  loadCenters,
  loadDistributors,
  loadFraud,
  loadPipeline,
  loadRegionLines,
  loadShortages,
  loadRegions,
  loadSeasons,
  loadVerifiedCount,
  type CenterRow,
  type DistributorRow,
  type FraudRow,
  type GeoRow,
  type PageCount,
  type Pipeline,
  type RegionLine,
  type SeasonRow,
  type ShortageRow,
} from '../api'
import { AdminFrame } from '../components/AdminFrame'
import { fraudLabel, localized, matches, problem, share, when } from '../text'

export function NationalAdminPage() {
  const { locale, t } = useLang()
  const [query, setQuery] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [regions, setRegions] = useState<RegionLine[] | null>(null)
  const [shortages, setShortages] = useState<ShortageRow[] | null>(null)
  const [places, setPlaces] = useState<GeoRow[] | null>(null)
  const [seasons, setSeasons] = useState<SeasonRow[] | null>(null)
  const [centers, setCenters] = useState<CenterRow[] | null>(null)
  const [distributors, setDistributors] = useState<DistributorRow[] | null>(null)
  const [flags, setFlags] = useState<FraudRow[] | null>(null)
  const [verified, setVerified] = useState<PageCount | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      loadSeasons(),
      loadRegions(),
      loadCenters(),
      loadDistributors(),
      loadFraud('open'),
      loadVerifiedCount(),
    ]).then((results) => {
      if (cancelled) return
      const [seasonPage, placePage, centerPage, distributorPage, fraudPage, verifiedPage] = results
      const failed = results.find((result) => result.status === 'rejected')
      setError(failed && failed.status === 'rejected' ? problem(failed.reason, t.errorGeneric) : null)
      if (seasonPage.status === 'fulfilled') {
        setSeasons(seasonPage.value.items)
        const open = seasonPage.value.items.find((season) => season.status === 'open') ?? seasonPage.value.items[0]
        if (open) setSeasonId((current) => current || open.id)
      } else setSeasons([])
      setPlaces(placePage.status === 'fulfilled' ? placePage.value.items : [])
      setCenters(centerPage.status === 'fulfilled' ? centerPage.value.items : [])
      setDistributors(distributorPage.status === 'fulfilled' ? distributorPage.value.items : [])
      setFlags(fraudPage.status === 'fulfilled' ? fraudPage.value.items : [])
      setVerified(verifiedPage.status === 'fulfilled' ? verifiedPage.value : { count: 0, more: false })
    })
    return () => {
      cancelled = true
    }
  }, [t.errorGeneric])

  useEffect(() => {
    if (!seasonId) return
    let cancelled = false
    Promise.allSettled([loadPipeline(seasonId), loadRegionLines(seasonId), loadShortages(seasonId)]).then(
      ([pipelinePage, regionPage, shortagePage]) => {
      if (cancelled) return
      const failed = [pipelinePage, regionPage, shortagePage].find((result) => result.status === 'rejected')
      if (failed && failed.status === 'rejected') setError(problem(failed.reason, t.errorGeneric))
      setPipeline(
        pipelinePage.status === 'fulfilled'
          ? pipelinePage.value
          : {
              date: '',
              requestedKg: 0,
              acceptedKg: 0,
              paidKg: 0,
              dispatchedKg: 0,
              receivedKg: 0,
              handedOverKg: 0,
              onHandKg: 0,
              requestCount: 0,
              avgCycleDays: 0,
            },
      )
      setRegions(regionPage.status === 'fulfilled' ? regionPage.value.items : [])
      setShortages(shortagePage.status === 'fulfilled' ? shortagePage.value.items : [])
    })
    return () => {
      cancelled = true
    }
  }, [seasonId, t.errorGeneric])

  const needle = query.trim().toLowerCase()
  const placeById = useMemo(() => new Map((places ?? []).map((place) => [place.id, place])), [places])
  const season = seasons?.find((item) => item.id === seasonId)
  const delivered = pipeline ? share(pipeline.handedOverKg, pipeline.requestedKg) : 0
  const activeDistributors = (distributors ?? []).filter((row) => row.status === 'active')
  const highFlags = (flags ?? []).filter((flag) => /high|critical/i.test(flag.severity)).length
  const regionRows = (regions ?? [])
    .map((row) => {
      const place = placeById.get(row.geoId)
      return {
        ...row,
        name: place ? localized(place.name, locale) : t.adminUnknown,
        centers: (centers ?? []).filter((center) => center.regionId === row.geoId).length,
      }
    })
    .filter((row) => matches(needle, row.name))
  const flagRows = (flags ?? [])
    .filter((row) => matches(needle, fraudLabel(row.type, t.adminLedger), row.severity, row.status))
    .slice(0, 5)
  const shortageRows = (shortages ?? [])
    .map((row) => ({
      ...row,
      name: (centers ?? []).find((center) => center.id === row.geoId)?.name ?? t.adminUnknown,
      shortKg: Math.max(0, row.acceptedKg - row.receivedKg),
    }))
    .filter((row) => matches(needle, row.name))

  return (
    <AdminFrame
      eyebrow={season ? `${season.code} · ${season.name}` : t.adminEyebrow}
      title={t.adminTitle}
      hint={t.adminHint}
      query={query}
      onQuery={setQuery}
      extra={
        seasons && seasons.length > 0 ? (
          <label className="admin__season-wrap">
            <span>{t.adminSeasons}</span>
            <select className="admin__season" value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>
              {seasons.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null
      }
    >
      {error ? (
        <p className="admin__error" role="alert">
          {error}
        </p>
      ) : null}
      {seasons === null ? <p className="admin__empty">{t.farmerLoading}</p> : null}
      <section className="admin__stats" aria-label={t.adminOverview}>
        <article className="admin__stat">
          <span className="admin__stat-icon admin__stat-icon--green">
            <Icon name="agriculture" size="sm" />
          </span>
          <p>{t.adminVerified}</p>
          <strong>{verified ? (verified.more ? `${verified.count}+` : String(verified.count)) : '—'}</strong>
          <small>{verified?.more ? t.adminMorePages : t.adminActive}</small>
        </article>
        <article className="admin__stat">
          <span className="admin__stat-icon admin__stat-icon--green">
            <Icon name="local_shipping" size="sm" />
          </span>
          <p>{t.adminDeliveredSeason}</p>
          <strong>{pipeline?.date ? `${delivered}%` : '—'}</strong>
          <small>
            {pipeline?.date
              ? `${formatQuintal(pipeline.handedOverKg)} / ${formatQuintal(pipeline.requestedKg)} ${t.farmerQuintal}`
              : t.adminNoSnapshot}
          </small>
        </article>
        <article className="admin__stat">
          <span className="admin__stat-icon admin__stat-icon--red">
            <Icon name="error" size="sm" />
          </span>
          <p>{t.adminOpenAlerts}</p>
          <strong>{flags ? String(flags.length) : '—'}</strong>
          <small>
            {highFlags} {t.adminHighSeverity}
          </small>
        </article>
        <article className="admin__stat">
          <span className="admin__stat-icon admin__stat-icon--blue">
            <Icon name="account_balance" size="sm" />
          </span>
          <p>{t.adminActiveNow}</p>
          <strong>{distributors ? String(activeDistributors.length) : '—'}</strong>
          <small>
            {activeDistributors.filter((row) => row.type === 'government').length} {t.adminGovernment}
            {' · '}
            {activeDistributors.filter((row) => row.type === 'private').length} {t.adminPrivate}
          </small>
        </article>
      </section>
      <div className="admin__split">
        <section className="admin__card" aria-labelledby="admin-regions">
          <div className="admin__card-head">
            <div>
              <h2 id="admin-regions">{t.adminRegionTitle}</h2>
              <p>{t.adminRegionHint}</p>
            </div>
          </div>
          {pipeline && !pipeline.date ? <p className="admin__empty">{t.adminNoSnapshot}</p> : null}
          {regions?.length === 0 && pipeline?.date ? <p className="admin__empty">{t.adminEmpty}</p> : null}
          {regionRows.length > 0 ? (
            <div className="admin__table-wrap">
              <table className="admin__table">
                <thead>
                  <tr>
                    <th>{t.adminColRegion}</th>
                    <th>{t.adminColCenters}</th>
                    <th>{t.adminColRequests}</th>
                    <th>{t.adminColDelivered}</th>
                    <th>{t.adminColShortage}</th>
                  </tr>
                </thead>
                <tbody>
                  {regionRows.map((row) => {
                    const percent = share(row.handedOverKg, row.requestedKg)
                    const shortKg = Math.max(0, row.acceptedKg - row.receivedKg)
                    return (
                      <tr key={row.geoId}>
                        <td className="admin__strong">{row.name}</td>
                        <td>{row.centers}</td>
                        <td>{row.requestCount}</td>
                        <td>
                          <div className="admin__meter">
                            <span className={percent < 50 ? 'is-low' : undefined} style={{ width: `${percent}%` }} />
                          </div>
                          <span className="admin__percent">{percent}%</span>
                        </td>
                        <td>
                          {shortKg > 0 ? (
                            <span className="admin__chip admin__chip--stop">
                              {formatKg(shortKg)} {t.farmerKg}
                            </span>
                          ) : (
                            <span className="admin__chip">{t.adminShortageNone}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
        <section className="admin__card" aria-labelledby="admin-fraud">
          <div className="admin__card-head">
            <h2 id="admin-fraud">{t.adminFraudPanel}</h2>
            <Link className="admin__card-link" to="/admin/fraud">
              {t.adminFraud}
            </Link>
          </div>
          {flags?.length === 0 ? <p className="admin__empty">{t.adminEmpty}</p> : null}
          <ul className="admin__alerts">
            {flagRows.map((flag) => (
              <li key={flag.id}>
                <span className={`admin__alert-mark${/high|critical/i.test(flag.severity) ? ' is-high' : ''}`}>
                  <Icon name="error" size="sm" />
                </span>
                <span>
                  <strong>{fraudLabel(flag.type, t.adminLedger)}</strong>
                  <small>
                    {flag.severity}
                    {flag.createdAt ? ` · ${when(flag.createdAt, locale)}` : ''}
                  </small>
                </span>
                <span className="admin__chip admin__chip--stop">{t.adminOpen}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="admin__card" aria-labelledby="admin-shortages">
        <div className="admin__card-head">
          <h2 id="admin-shortages">{t.adminShortages}</h2>
        </div>
        {shortageRows.length === 0 ? <p className="admin__empty">{t.adminEmpty}</p> : null}
        {shortageRows.length > 0 ? (
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>{t.adminCenters}</th>
                  <th>{t.adminColShortage}</th>
                </tr>
              </thead>
              <tbody>
                {shortageRows.map((row) => (
                  <tr key={row.geoId}>
                    <td className="admin__strong">{row.name}</td>
                    <td>
                      {formatKg(row.shortKg)} {t.farmerKg}
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
