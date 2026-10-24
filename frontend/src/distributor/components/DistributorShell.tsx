import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '@/auth/api'
import { readAccessRole, restoreSession } from '@/shared/api/client'
import { useLang } from '@/shared/i18n/LangContext'
import { Icon } from '@/shared/ui/Icon'
import '@/admin/components/AdminShell.css'

const LINKS = [
  { to: '/distributor', end: true, label: 'distRequisitions', icon: 'agriculture' },
  { to: '/distributor/shipments', end: false, label: 'distShipments', icon: 'local_shipping' },
  { to: '/distributor/payments', end: false, label: 'distPayments', icon: 'verified_user' },
] as const

export function DistributorShell() {
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
      setAllowed(readAccessRole() === 'distributor_staff')
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
        <NavLink to="/distributor" end className="admin__brand">
          <span className="admin__mark">
            <Icon name="eco" size="sm" />
          </span>
          <span>
            <strong>{t.appName}</strong>
            <small>{t.distOversight}</small>
          </span>
        </NavLink>
        {allowed ? (
          <nav className="admin__nav" aria-label={t.distRole}>
            {LINKS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
                <Icon name={item.icon} size="sm" />
                {t[item.label]}
              </NavLink>
            ))}
          </nav>
        ) : null}
        <div className="admin__side-foot">
          <button type="button" className="admin__switch" onClick={() => void signOut()}>
            <Icon name="logout" size="sm" />
            {t.distSignOut}
          </button>
        </div>
      </aside>
      <div className="admin__workspace">
        {allowed ? <Outlet /> : (
          <main className="admin__main">
            <h1 className="admin__title">{t.distRole}</h1>
            <p className="admin__empty">{t.distWrongRole}</p>
          </main>
        )}
      </div>
    </div>
  )
}
