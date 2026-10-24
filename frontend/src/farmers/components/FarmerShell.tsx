import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '@/auth/api'
import { readAccessRole, restoreSession } from '@/shared/api/client'
import { useLang } from '@/shared/i18n/LangContext'
import { Icon } from '@/shared/ui/Icon'
import { LanguageSwitch } from '@/shared/ui/LanguageSwitch'
import './FarmerShell.css'

export function FarmerShell() {
  const { locale, t } = useLang()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    restoreSession().then((ok) => {
      if (cancelled) return
      if (!ok || readAccessRole() !== 'farmer') {
        navigate('/auth/farmer', { replace: true })
        return
      }
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
      <div className="farmer farmer--loading" lang={locale}>
        <p>{t.farmerLoading}</p>
      </div>
    )
  }

  return (
    <div className="farmer" lang={locale}>
      <header className="farmer__bar">
        <NavLink to="/farmer" className="farmer__brand">
          <span className="farmer__mark">
            <Icon name="eco" size="sm" />
          </span>
          <span>{t.appName}</span>
        </NavLink>
        <div className="farmer__bar-actions">
          <LanguageSwitch tone="dark" />
          <button type="button" className="farmer__signout" onClick={() => void signOut()}>
            {t.farmerSignOut}
          </button>
        </div>
      </header>
      <nav className="farmer__nav" aria-label={t.portalFarmerTitle}>
        <NavLink to="/farmer" end>
          {t.farmerNavHome}
        </NavLink>
        <NavLink to="/farmer/request">{t.farmerNewRequest}</NavLink>
      </nav>
      <Outlet />
    </div>
  )
}

export function FarmerMain({ children }: { children: ReactNode }) {
  return <main className="farmer__main">{children}</main>
}
