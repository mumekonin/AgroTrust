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
  iconName = 'security',
  badgeText,
}: AuthLayoutProps) {
  const { t, locale } = useLang()

  return (
    <div className="auth-container" lang={locale}>
      <div className="auth-topbar">
        <Link to="/" className="auth-back-link">
          <Icon name="arrow_back" size="sm" />
          <span>{t.linkBackToPortal}</span>
        </Link>
        <LanguageSwitch tone="light" />
      </div>

      {/* Main card */}
      <div className="auth-card-wrap">
        <div className="auth-card">
          {/* Header */}
          <div className="auth-card__header">
            <div className="auth-card__icon-badge">
              <Icon name={iconName} size="lg" />
            </div>
            {badgeText && <span className="auth-card__pill">{badgeText}</span>}
            <h1 className="auth-card__title">{title}</h1>
            {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
          </div>

          {/* Form / Content */}
          <div className="auth-card__body">{children}</div>
        </div>
      </div>
    </div>
  )
}
