import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, createIdempotencyKey } from '@/shared/api/client'
import { formatBirr, formatKg, formatQuintal } from '@/shared/format/quantity'
import { useLang } from '@/shared/i18n/LangContext'
import type { Locale } from '@/shared/i18n'
import { Button } from '@/shared/ui/Button'
import {
  listAllocations,
  listCatalog,
  listSeasons,
  submitRequest,
  type Allocation,
  type CatalogItem,
  type Season,
} from '../api'
import { FarmerMain } from '../components/FarmerShell'
import './FarmerRequestPage.css'

function named(item: CatalogItem, locale: Locale): string {
  return item.name[locale] || item.name.en
}

export function FarmerRequestPage() {
  const { locale, t } = useLang()
  const navigate = useNavigate()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [seasonId, setSeasonId] = useState('')
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [catalogSeasonId, setCatalogSeasonId] = useState('')
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [qty, setQty] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [idempotencyKey] = useState(createIdempotencyKey)

  useEffect(() => {
    let cancelled = false
    Promise.all([listSeasons(), listAllocations()])
      .then(([seasonPage, allocationPage]) => {
        if (cancelled) return
        const open = seasonPage.items.filter((season) => season.status === 'open')
        setSeasons(open)
        setAllocations(allocationPage.items)
        setSeasonId(open[0]?.id ?? '')
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.detail || err.problem.title : t.errorGeneric)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t.errorGeneric])

  useEffect(() => {
    if (!seasonId) return
    let cancelled = false
    listCatalog(seasonId)
      .then((page) => {
        if (cancelled) return
        setCatalog(page.items)
        setCatalogSeasonId(seasonId)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setCatalog([])
        setCatalogSeasonId(seasonId)
        setError(err instanceof ApiError ? err.detail || err.problem.title : t.errorGeneric)
      })
    return () => {
      cancelled = true
    }
  }, [seasonId, t.errorGeneric])

  function remainingKg(inputId: string): number | undefined {
    return allocations.find((item) => item.seasonId === seasonId && item.inputId === inputId)?.remainingKg
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const items = catalog
      .map((item) => ({ inputId: item.id, qtyKg: Number(qty[item.id] || 0) }))
      .filter((item) => item.qtyKg > 0)

    if (!seasonId || items.length === 0) {
      setError(t.errorRequired)
      return
    }
    for (const item of items) {
      if (!Number.isInteger(item.qtyKg) || item.qtyKg < 1) {
        setError(t.errorRequired)
        return
      }
      const remaining = remainingKg(item.inputId)
      if (remaining === undefined || item.qtyKg > remaining) {
        setError(t.farmerOverEntitlement)
        return
      }
    }

    setSaving(true)
    try {
      await submitRequest({ seasonId, items }, idempotencyKey)
      navigate('/farmer')
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.detail || err.problem.title : t.errorGeneric)
    } finally {
      setSaving(false)
    }
  }

  const priced = (catalogSeasonId === seasonId ? catalog : []).filter((item) => item.price)
  const payableSantim = priced.reduce((sum, item) => {
    const kilograms = Number(qty[item.id] || 0)
    if (!item.price || !Number.isInteger(kilograms) || kilograms < 1) return sum
    return sum + kilograms * (item.price.unitPriceSantimPerKg - item.price.subsidySantimPerKg)
  }, 0)

  return (
    <FarmerMain>
      <p className="farmer__eyebrow">{t.portalFarmerTitle}</p>
      <h1 className="farmer__title">{t.farmerNewRequest}</h1>
      <p className="farmer__hint">{t.farmerRequestHint}</p>
      {error ? (
        <p className="farmer__error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="farmer__empty">{t.farmerLoading}</p> : null}
      {!loading && seasons.length === 0 ? <p className="farmer__empty">{t.farmerSeasonClosed}</p> : null}
      {!loading && seasons.length > 0 ? (
        <form className="farmer__card" onSubmit={(event) => void onSubmit(event)}>
          {seasons.length > 1 ? (
            <label className="farmer-request__field">
              <span>{t.farmerSeason}</span>
              <select value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="farmer__meta">{seasons[0]?.name}</p>
          )}
          {priced.length === 0 ? <p className="farmer__empty">{t.farmerNoCatalog}</p> : null}
          <ul className="farmer-request__list">
            {priced.map((item) => {
              const remaining = remainingKg(item.id)
              const blocked = remaining === undefined || remaining < 1
              const price = item.price
              return (
                <li key={item.id}>
                  <div className="farmer__row">
                    <strong>{named(item, locale)}</strong>
                    {price ? (
                      <span className="farmer__meta">
                        {formatBirr(price.unitPriceSantimPerKg - price.subsidySantimPerKg)} {t.farmerBirr}/{t.farmerKg}
                      </span>
                    ) : null}
                  </div>
                  {blocked ? (
                    <p className="farmer__note">{t.farmerNoEntitlement}</p>
                  ) : (
                    <>
                      <p className="farmer__meta">
                        {t.farmerRemaining}: {formatQuintal(remaining)} {t.farmerQuintal}
                        {' · '}
                        {formatKg(remaining)} {t.farmerKg}
                      </p>
                      <label className="farmer-request__field">
                        <span>{t.farmerQty}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={remaining}
                          step={1}
                          value={qty[item.id] ?? ''}
                          onChange={(event) =>
                            setQty((current) => ({ ...current, [item.id]: event.target.value }))
                          }
                        />
                      </label>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="farmer__qty">
            {t.farmerPayable}: {formatBirr(payableSantim)} {t.farmerBirr}
          </p>
          <Button type="submit" disabled={saving || priced.length === 0}>
            {saving ? t.farmerLoading : t.farmerSubmitRequest}
          </Button>
        </form>
      ) : null}
    </FarmerMain>
  )
}
