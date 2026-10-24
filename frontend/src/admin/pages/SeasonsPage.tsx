import { useEffect, useState } from 'react'
import { formatBirr } from '@/shared/format/quantity'
import { useLang } from '@/shared/i18n/LangContext'
import type { Strings } from '@/shared/i18n'
import { loadPrices, loadSeasons, type PriceRow, type SeasonRow } from '../api'
import { AdminFrame } from '../components/AdminFrame'
import { localized, matches, problem, when } from '../text'

function seasonChip(status: SeasonRow['status'], t: Strings): string {
  if (status === 'open') return t.adminOpen
  if (status === 'closed') return t.adminClosed
  return t.adminDraft
}

export function SeasonsPage() {
  const { locale, t } = useLang()
  const [query, setQuery] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [seasons, setSeasons] = useState<SeasonRow[] | null>(null)
  const [prices, setPrices] = useState<PriceRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadSeasons()
      .then((page) => {
        if (cancelled) return
        setSeasons(page.items)
        const open = page.items.find((season) => season.status === 'open') ?? page.items[0]
        if (open) setSeasonId((current) => current || open.id)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(problem(err, t.errorGeneric))
        setSeasons([])
      })
    return () => {
      cancelled = true
    }
  }, [t.errorGeneric])

  useEffect(() => {
    if (!seasonId) return
    let cancelled = false
    loadPrices(seasonId)
      .then((rows) => {
        if (!cancelled) setPrices(rows)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(problem(err, t.errorGeneric))
        setPrices([])
      })
    return () => {
      cancelled = true
    }
  }, [seasonId, t.errorGeneric])

  const needle = query.trim().toLowerCase()
  const seasonRows = (seasons ?? []).filter((row) => matches(needle, row.name, row.code, row.status))
  const priceRows = (prices ?? []).filter((row) => matches(needle, row.code, row.name.en, row.name.am, row.name.om))
  const selected = seasons?.find((item) => item.id === seasonId)

  return (
    <AdminFrame eyebrow={t.adminEyebrow} title={t.adminSeasons} hint={t.adminSeasonsHint} query={query} onQuery={setQuery}>
      {error ? (
        <p className="admin__error" role="alert">
          {error}
        </p>
      ) : null}
      {seasons === null ? <p className="admin__empty">{t.farmerLoading}</p> : null}
      <div className="admin__split">
        <section className="admin__card" aria-labelledby="season-list">
          <div className="admin__card-head">
            <h2 id="season-list">{t.adminSeasons}</h2>
          </div>
          {seasons?.length === 0 ? <p className="admin__empty">{t.adminEmpty}</p> : null}
          <ul className="admin__list">
            {seasonRows.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`admin__pick${item.id === seasonId ? ' is-selected' : ''}`}
                  onClick={() => setSeasonId(item.id)}
                >
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.code}
                      {' · '}
                      {when(item.startsAt, locale)} – {when(item.endsAt, locale)}
                    </small>
                    <small>
                      {t.adminRequestsOpen} {when(item.requestsOpenAt, locale)}
                      {' · '}
                      {t.adminRequestsClose} {when(item.requestsCloseAt, locale)}
                    </small>
                    <small>
                      {t.adminPaymentWindow} {item.paymentWindowDays} {t.adminDays}
                      {' · '}
                      {t.adminPickupWindow} {item.pickupWindowDays} {t.adminDays}
                    </small>
                  </span>
                  <span
                    className={`admin__chip${item.status === 'closed' ? ' admin__chip--stop' : ''}${item.status === 'draft' ? ' admin__chip--wait' : ''}`}
                  >
                    {seasonChip(item.status, t)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="admin__card" aria-labelledby="season-prices">
          <div className="admin__card-head">
            <div>
              <h2 id="season-prices">{t.adminPrices}</h2>
              {selected ? <p>{selected.name}</p> : null}
            </div>
          </div>
          {prices?.length === 0 ? <p className="admin__empty">{t.adminEmpty}</p> : null}
          <ul className="admin__list">
            {priceRows.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{localized(item.name, locale)}</strong>
                  <small>
                    {item.code}
                    {item.subsidySantimPerKg > 0
                      ? ` · ${t.adminSubsidy} ETB ${formatBirr(item.subsidySantimPerKg)}`
                      : ''}
                  </small>
                </div>
                <span className="admin__price">
                  ETB {formatBirr(item.unitPriceSantimPerKg)}
                  <small>{t.adminPerKg}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminFrame>
  )
}
