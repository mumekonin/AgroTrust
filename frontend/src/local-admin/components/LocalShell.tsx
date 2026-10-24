import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '@/auth/api'
import { getAccessToken, readAccessRole, restoreSession } from '@/shared/api/client'
import { useLang } from '@/shared/i18n/LangContext'
import { Icon } from '@/shared/ui/Icon'
import '@/admin/components/AdminShell.css'

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

export function LocalShell() {
  const { locale, t } = useLang()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [minutes, setMinutes] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    restoreSession().then((ok) => {
      if (cancelled) return
      if (!ok) {
        navigate('/auth/staff', { replace: true })
        return
      }
      setAllowed(readAccessRole() === 'local_admin')
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
        <NavLink to="/local" end className="admin__brand">
          <span className="admin__mark">
            <Icon name="eco" size="sm" />
          </span>
          <span>
            <strong>{t.appName}</strong>
            <small>{t.localOversight}</small>
          </span>
        </NavLink>
        {allowed ? (
          <nav className="admin__nav" aria-label={t.localRoleLabel}>
            <NavLink to="/local" end className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
              <Icon name="person" size="sm" />
              {t.localFarmers}
            </NavLink>
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
            {t.localSignOut}
          </button>
        </div>
      </aside>
      <div className="admin__workspace">
        {allowed ? (
          <Outlet />
        ) : (
          <main className="admin__main">
            <h1 className="admin__title">{t.localRoleLabel}</h1>
            <p className="admin__empty">{t.localWrongRole}</p>
          </main>
        )}
      </div>
    </div>
  )
}
