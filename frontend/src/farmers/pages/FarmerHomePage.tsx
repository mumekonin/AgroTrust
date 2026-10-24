import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/shared/api/client'
import { formatBirr, formatKg, formatQuintal } from '@/shared/format/quantity'
import { useLang } from '@/shared/i18n/LangContext'
import type { Locale } from '@/shared/i18n'
import './FarmerHomePage.css'
import {
  listAllocations,
  listCatalog,
  listMyRequests,
  listNotifications,
  type Allocation,
  type CatalogItem,
  type FarmerNotification,
  type InputRequest,
} from '../api'
import { FarmerMain } from '../components/FarmerShell'
import { StepTracker } from '../components/StepTracker'
import { isStopped, statusLabel, stepFor, stepLabels } from '../status'

interface Names {
  en: string
  am: string
  om: string
}

function inputLabel(names: Map<string, Names>, id: string, locale: Locale, fallback: string): string {
  const name = names.get(id)
  if (!name) return fallback
  return name[locale] || name.en
}

function requestKg(request: InputRequest): number {
  return request.items.reduce((sum, item) => sum + (item.acceptedQtyKg ?? item.qtyKg), 0)
}

export function FarmerHomePage() {
  const { locale, t } = useLang()
  const [allocations, setAllocations] = useState<Allocation[] | null>(null)
  const [requests, setRequests] = useState<InputRequest[] | null>(null)
  const [notifications, setNotifications] = useState<FarmerNotification[] | null>(null)
  const [names, setNames] = useState<Map<string, Names>>(new Map())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([listAllocations(), listMyRequests(), listNotifications()])
      .then(async ([allocationPage, requestPage, notificationPage]) => {
        const seasonIds = new Set([
          ...allocationPage.items.map((item) => item.seasonId),
          ...requestPage.items.map((item) => item.seasonId),
        ])
        const catalogs = await Promise.all(
          [...seasonIds].map((seasonId) => listCatalog(seasonId).catch(() => ({ items: [] as CatalogItem[] }))),
        )
        const nextNames = new Map<string, Names>()
        for (const catalog of catalogs) {
          for (const item of catalog.items) nextNames.set(item.id, item.name)
        }
        if (cancelled) return
        setAllocations(allocationPage.items)
        setRequests(requestPage.items)
        setNotifications(notificationPage.items)
        setNames(nextNames)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.detail || err.problem.title : t.errorGeneric)
        setAllocations([])
        setRequests([])
        setNotifications([])
      })
    return () => {
      cancelled = true
    }
  }, [t.errorGeneric])

  const newest = requests ? [...requests].reverse() : []
  const active =
    newest.find((request) => request.status !== 'COMPLETED' && !isStopped(request.status)) ?? newest[0]
  const loading = allocations === null || requests === null || notifications === null

  return (
    <FarmerMain>
      <p className="farmer__eyebrow">{t.farmerHomeEyebrow}</p>
      <h1 className="farmer__title">{t.farmerHomeTitle}</h1>
      <p className="farmer__hint">{t.farmerHomeHint}</p>
      {error ? <p className="farmer__error" role="alert">{error}</p> : null}

      <section className="farmer__card" aria-labelledby="farmer-progress">
        <h2 id="farmer-progress">{t.farmerProgress}</h2>
        {loading ? <p className="farmer__empty">{t.farmerLoading}</p> : null}
        {!loading && !active ? (
          <>
            <p className="farmer__empty">{t.farmerNoRequest}</p>
            <Link to="/farmer/request" className="at-btn at-btn--primary farmer-home__cta">
              {t.farmerNewRequest}
            </Link>
          </>
        ) : null}
        {active ? (
          <>
            <div className="farmer__row">
              <span className={`farmer__status${isStopped(active.status) ? ' farmer__status--stop' : ''}`}>
                {statusLabel(active.status, t)}
                {active.waitlisted ? ` · ${t.farmerWaitlisted}` : ''}
              </span>
              <span className="farmer__meta">{active.requestNo}</span>
            </div>
            {!isStopped(active.status) ? (
              <StepTracker current={stepFor(active.status)} labels={stepLabels(t)} />
            ) : null}
            <p className="farmer__qty">
              {formatQuintal(requestKg(active))} {t.farmerQuintal}
              {' · '}
              {formatKg(requestKg(active))} {t.farmerKg}
            </p>
            <p className="farmer__meta">
              {t.farmerPayable}: {formatBirr(active.payableSantim)} {t.farmerBirr}
            </p>
            {active.rejectionReason ? <p className="farmer__note">{active.rejectionReason}</p> : null}
            {active.status === 'READY_FOR_PICKUP' ? <p className="farmer__note">{t.farmerSmsNote}</p> : null}
          </>
        ) : null}
      </section>

      <section className="farmer__card" aria-labelledby="farmer-entitlement">
        <h2 id="farmer-entitlement">{t.farmerEntitlement}</h2>
        {loading ? <p className="farmer__empty">{t.farmerLoading}</p> : null}
        {!loading && allocations?.length === 0 ? <p className="farmer__empty">{t.farmerNoEntitlement}</p> : null}
        {allocations?.map((allocation) => (
          <article key={allocation.id} className="farmer-home__allocation">
            <h3>{inputLabel(names, allocation.inputId, locale, t.farmerInput)}</h3>
            <p className="farmer__qty">
              {t.farmerRemaining}: {formatQuintal(allocation.remainingKg)} {t.farmerQuintal}
              {' · '}
              {formatKg(allocation.remainingKg)} {t.farmerKg}
            </p>
            <p className="farmer__meta">
              {t.farmerEntitled} {formatKg(allocation.entitledKg)} {t.farmerKg}
              {' · '}
              {t.farmerReserved} {formatKg(allocation.reservedKg)} {t.farmerKg}
              {' · '}
              {t.farmerPurchased} {formatKg(allocation.purchasedKg)} {t.farmerKg}
            </p>
          </article>
        ))}
      </section>

      <section className="farmer__card" aria-labelledby="farmer-requests">
        <div className="farmer__row">
          <h2 id="farmer-requests">{t.farmerRequests}</h2>
          <Link to="/farmer/request" className="farmer-home__text-link">
            {t.farmerNewRequest}
          </Link>
        </div>
        {loading ? <p className="farmer__empty">{t.farmerLoading}</p> : null}
        {!loading && newest.length === 0 ? <p className="farmer__empty">{t.farmerNoRequest}</p> : null}
        <ul className="farmer-home__list">
          {newest.map((request) => (
            <li key={request.id}>
              <div className="farmer__row">
                <span>{request.requestNo}</span>
                <span className={`farmer__status${isStopped(request.status) ? ' farmer__status--stop' : ''}`}>
                  {statusLabel(request.status, t)}
                </span>
              </div>
              <p className="farmer__meta">
                {formatQuintal(requestKg(request))} {t.farmerQuintal}
                {' · '}
                {formatBirr(request.payableSantim)} {t.farmerBirr}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="farmer__card" aria-labelledby="farmer-messages">
        <h2 id="farmer-messages">{t.farmerNotifications}</h2>
        {loading ? <p className="farmer__empty">{t.farmerLoading}</p> : null}
        {!loading && notifications?.length === 0 ? (
          <p className="farmer__empty">{t.farmerNoNotifications}</p>
        ) : null}
        <ul className="farmer-home__list">
          {notifications?.map((note) => (
            <li key={note.id}>
              <p>{note.body || t.farmerMessageFallback}</p>
            </li>
          ))}
        </ul>
      </section>
    </FarmerMain>
  )
}
