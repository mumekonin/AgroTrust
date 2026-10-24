import { useEffect, useState } from 'react'
import { readAccessRole } from '@/shared/api/client'
import { useLang } from '@/shared/i18n/LangContext'
import type { Strings } from '@/shared/i18n'
import { Icon } from '@/shared/ui/Icon'
import { loadFraud, type FraudRow } from '../api'
import { AdminFrame } from '../components/AdminFrame'
import { StepUpForm } from '../components/StepUpForm'
import { fraudLabel, matches, problem, when } from '../text'
import { adminWrite } from '../write'

const FILTERS = ['', 'open', 'reviewing', 'resolved'] as const

function filterLabel(value: (typeof FILTERS)[number], t: Strings): string {
  if (value === 'open') return t.adminOpen
  if (value === 'reviewing') return t.adminReviewing
  if (value === 'resolved') return t.adminResolved
  return t.adminAll
}

function statusLabel(status: FraudRow['status'], t: Strings): string {
  if (status === 'open') return t.adminOpen
  if (status === 'reviewing') return t.adminReviewing
  return t.adminResolved
}

export function FraudPage() {
  const { locale, t } = useLang()
  const canResolve = readAccessRole() !== 'auditor'
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('')
  const [rows, setRows] = useState<FraudRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadFraud(filter || undefined)
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
  }, [filter, t.errorGeneric, tick])

  const needle = query.trim().toLowerCase()
  const visible = (rows ?? []).filter((row) =>
    matches(needle, fraudLabel(row.type, t.adminLedger), row.severity, statusLabel(row.status, t)),
  )

  return (
    <AdminFrame
      eyebrow={t.adminEyebrow}
      title={t.adminFraud}
      hint={t.adminFraudHint}
      query={query}
      onQuery={setQuery}
      extra={
        <div className="admin__filters" role="group" aria-label={t.adminStatus}>
          {FILTERS.map((value) => (
            <button
              key={value || 'all'}
              type="button"
              className={filter === value ? 'is-selected' : undefined}
              onClick={() => setFilter(value)}
            >
              {filterLabel(value, t)}
            </button>
          ))}
        </div>
      }
    >
      {error ? (
        <p className="admin__error" role="alert">
          {error}
        </p>
      ) : null}
      {rows === null ? <p className="admin__empty">{t.farmerLoading}</p> : null}
      <section className="admin__card">
        <StepUpForm />
      </section>
      <section className="admin__card">
        {rows?.length === 0 ? <p className="admin__empty">{t.adminEmpty}</p> : null}
        <ul className="admin__alerts">
          {visible.map((flag) => (
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
              <span className="admin__flag-actions">
                <span className={`admin__chip${flag.status === 'open' ? ' admin__chip--stop' : ''}${flag.status === 'reviewing' ? ' admin__chip--wait' : ''}`}>
                  {statusLabel(flag.status, t)}
                </span>
                {canResolve ? (
                  <>
                    <button
                      type="button"
                      className="admin__text-btn"
                      onClick={() => {
                        void adminWrite(`/admin/fraud-flags/${flag.id}/resolve`, 'POST', { status: 'reviewing' })
                          .then(() => setTick((value) => value + 1))
                          .catch((err: unknown) => setError(problem(err, t.errorGeneric)))
                      }}
                    >
                      {t.adminReviewing}
                    </button>
                    <button
                      type="button"
                      className="admin__text-btn"
                      onClick={() => {
                        void adminWrite(`/admin/fraud-flags/${flag.id}/resolve`, 'POST', { status: 'resolved' })
                          .then(() => setTick((value) => value + 1))
                          .catch((err: unknown) => setError(problem(err, t.errorGeneric)))
                      }}
                    >
                      {t.adminResolved}
                    </button>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </AdminFrame>
  )
}
