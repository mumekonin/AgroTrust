import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '@/auth/api'
import { getAccessToken, readAccessRole, restoreSession } from '@/shared/api/client'
import { useLang } from '@/shared/i18n/LangContext'
import { Icon } from '@/shared/ui/Icon'
import './AdminShell.css'

const SECTIONS = [
  { to: '/admin', end: true, label: 'adminOverview', icon: 'dashboard' },
  { to: '/admin/seasons', end: false, label: 'adminSeasons', icon: 'calendar' },
  { to: '/admin/places', end: false, label: 'adminPlaces', icon: 'account_balance' },
  { to: '/admin/allocations', end: false, label: 'adminAllocations', icon: 'agriculture' },
  { to: '/admin/farmers', end: false, label: 'adminFarmers', icon: 'person' },
  { to: '/admin/centers', end: false, label: 'adminCenters', icon: 'account_balance' },
  { to: '/admin/distributors', end: false, label: 'adminDistributors', icon: 'local_shipping' },
  { to: '/admin/payments', end: false, label: 'adminPayments', icon: 'verified_user' },
  { to: '/admin/notifications', end: false, label: 'adminNotifications', icon: 'sms' },
  { to: '/admin/invitations', end: false, label: 'adminInvitations', icon: 'badge' },
  { to: '/admin/operations', end: false, label: 'adminOperations', icon: 'local_shipping' },
  { to: '/admin/fraud', end: false, label: 'adminFraud', icon: 'error' },
  { to: '/admin/audit', end: false, label: 'adminAudit', icon: 'history' },
] as const

const AUDITOR_NAV = new Set<string>(['/admin', '/admin/payments', '/admin/notifications', '/admin/fraud', '/admin/audit'])

function minutesLeft(): number | null {
  const token = getAccessToken()
  if (!token) return null
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='))
    const exp = (JSON.parse(json) as { exp?: unknown }).exp
    if (typeof exp !== 'number') return null
    return Math.max(0, Math.round((exp * 1000 - Date.now()) / 60000))
  } catch {
    return null
  }
}

export function AdminShell() {
  const { locale, t } = useLang()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [auditor, setAuditor] = useState(false)
  const [minutes, setMinutes] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    restoreSession().then((ok) => {
      if (cancelled) return
      if (!ok) {
        navigate('/auth/staff', { replace: true })
        return
      }
      const role = readAccessRole()
      setAuditor(role === 'auditor')
      setAllowed(role === 'national_admin' || role === 'auditor')
      setMinutes(minutesLeft())
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [navigate])

  async function signOut() {
    await logout()
    navigate('/')
  }

  if (!ready) {
    return (
      <div className="admin admin--loading" lang={locale}>
        <p>{t.farmerLoading}</p>
      </div>
    )
  }

  return (
    <div className="admin" lang={locale}>
      <aside className="admin__side">
        <NavLink to="/admin" end className="admin__brand">
          <span className="admin__mark">
            <Icon name="eco" size="sm" />
          </span>
          <span>
            <strong>{t.appName}</strong>
            <small>{auditor ? t.auditorRole : t.adminOversight}</small>
          </span>
        </NavLink>
        {allowed ? (
          <nav className="admin__nav" aria-label={t.adminTitle}>
            {(auditor ? SECTIONS.filter((item) => AUDITOR_NAV.has(item.to)) : SECTIONS).map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                <Icon name={item.icon} size="sm" />
                {t[item.label]}
              </NavLink>
            ))}
          </nav>
        ) : null}
        <div className="admin__side-foot">
          {minutes !== null ? (
            <p className="admin__session">
              <Icon name="verified_user" size="sm" />
              <span>
                <strong>{t.adminMfaOn}</strong>
                {t.adminSessionIn} {minutes} {t.adminMinutes}
              </span>
            </p>
          ) : null}
          <button type="button" className="admin__switch" onClick={() => void signOut()}>
            <Icon name="logout" size="sm" />
            {t.adminSwitch}
          </button>
        </div>
      </aside>
      <div className="admin__workspace">
        {allowed ? (
          <Outlet />
        ) : (
          <main className="admin__main">
            <h1 className="admin__title">{t.adminTitle}</h1>
            <p className="admin__empty">{t.adminWrongRole}</p>
          </main>
        )}
      </div>
    </div>
  )
}
