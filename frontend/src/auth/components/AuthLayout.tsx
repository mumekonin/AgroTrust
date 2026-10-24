import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '@/shared/i18n/LangContext'
import { LanguageSwitch } from '@/shared/ui/LanguageSwitch'
import { Icon } from '@/shared/ui/Icon'
import './AuthLayout.css'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  iconName?: string
  badgeText?: string
}

export function AuthLayout({
  children,
  title,
  subtitle,
  iconName = 'lock',
  badgeText,
}: AuthLayoutProps) {
  const { t, locale } = useLang()

  return (
    <div className="auth" lang={locale}>
      <aside className="auth__brand">
        <Link to="/" className="auth__logo">
          <span className="auth__mark">
            <Icon name="eco" size="sm" />
          </span>
          <span>{t.appName}</span>
        </Link>
        <div className="auth__brand-copy">
          <h2>{t.headline}</h2>
          <p>{t.tagline}</p>
        </div>
        <p className="auth__pilot">{t.pilotLine}</p>
      </aside>
      <section className="auth__panel">
        <div className="auth__topbar">
          <Link to="/" className="auth__back">
            <Icon name="arrow_back" size="sm" />
            <span>{t.linkBackToPortal}</span>
          </Link>
          <LanguageSwitch tone="light" />
        </div>
        <div className="auth__card-wrap">
          <div className="auth__card">
            <header className="auth__header">
              <span className="auth__badge">
                <Icon name={iconName} size="md" />
              </span>
              {badgeText ? <p className="auth__pill">{badgeText}</p> : null}
              <h1>{title}</h1>
              {subtitle ? <p className="auth__subtitle">{subtitle}</p> : null}
            </header>
            {children}
          </div>
        </div>
      </section>
    </div>
  )
}
