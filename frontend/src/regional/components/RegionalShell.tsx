import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '@/auth/api'
import { readAccessRole, restoreSession } from '@/shared/api/client'
import { useLang } from '@/shared/i18n/LangContext'
import { Icon } from '@/shared/ui/Icon'
import '@/admin/components/AdminShell.css'

export function RegionalShell() {
  const { locale, t } = useLang()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let cancelled = false
    restoreSession().then((ok) => {
      if (cancelled) return
      if (!ok) {
        navigate('/auth/staff', { replace: true })
        return
      }
      setAllowed(readAccessRole() === 'regional_admin')
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
        <NavLink to="/regional" end className="admin__brand">
          <span className="admin__mark">
            <Icon name="eco" size="sm" />
          </span>
          <span>
            <strong>{t.appName}</strong>
            <small>{t.regionalOversight}</small>
          </span>
        </NavLink>
        {allowed ? (
          <nav className="admin__nav" aria-label={t.regionalRoleLabel}>
            {([
              ['/regional', true, 'adminInvitations', 'badge'],
              ['/regional/overview', false, 'adminOverview', 'dashboard'],
              ['/regional/centers', false, 'adminCenters', 'account_balance'],
              ['/regional/distributors', false, 'adminDistributors', 'local_shipping'],
              ['/regional/allocations', false, 'adminAllocations', 'agriculture'],
              ['/regional/operations', false, 'adminOperations', 'local_shipping'],
              ['/regional/fraud', false, 'adminFraud', 'error'],
              ['/regional/audit', false, 'adminAudit', 'history'],
            ] as const).map(([to, end, label, icon]) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                <Icon name={icon} size="sm" />
                {t[label]}
              </NavLink>
            ))}
          </nav>
        ) : null}
        <div className="admin__side-foot">
          <button type="button" className="admin__switch" onClick={() => void signOut()}>
            <Icon name="logout" size="sm" />
            {t.regionalSignOut}
          </button>
        </div>
      </aside>
      <div className="admin__workspace">
        {allowed ? (
          <Outlet />
        ) : (
          <main className="admin__main">
            <h1 className="admin__title">{t.regionalRoleLabel}</h1>
            <p className="admin__empty">{t.regionalWrongRole}</p>
          </main>
        )}
      </div>
    </div>
  )
}
