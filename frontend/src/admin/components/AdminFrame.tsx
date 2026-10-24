import type { ReactNode } from 'react'
import { readAccessRole } from '@/shared/api/client'
import { useLang } from '@/shared/i18n/LangContext'
import { Icon } from '@/shared/ui/Icon'
import { LanguageSwitch } from '@/shared/ui/LanguageSwitch'
import '../pages/NationalAdminPage.css'

export function AdminFrame({
  eyebrow,
  title,
  hint,
  query,
  onQuery,
  extra,
  children,
}: {
  eyebrow?: string
  title: string
  hint: string
  query: string
  onQuery: (value: string) => void
  extra?: ReactNode
  children: ReactNode
}) {
  const { t } = useLang()
  const role = readAccessRole()
  const mark = role === 'regional_admin' ? 'RA' : role === 'auditor' ? 'AU' : 'NA'
  const roleLabel = role === 'regional_admin' ? t.regionalRoleLabel : role === 'auditor' ? t.auditorRole : t.adminRoleLabel
  const office =
    role === 'regional_admin' ? t.regionalOversight : role === 'auditor' ? t.auditorRole : t.adminOversight
  return (
    <main className="admin__main">
      <div className="admin__top">
        <label className="admin__search">
          <Icon name="search" size="sm" />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={t.adminSearch}
            aria-label={t.adminSearch}
          />
        </label>
        <LanguageSwitch tone="light" />
        <div className="admin__who">
          <span className="admin__avatar" aria-hidden>
            {mark}
          </span>
          <span>
            <strong>{roleLabel}</strong>
            <small>{office}</small>
          </span>
        </div>
      </div>
      <header className="admin__head">
        <div>
          {eyebrow ? <p className="admin__eyebrow">{eyebrow}</p> : null}
          <h1 className="admin__title">{title}</h1>
          <p className="admin__hint">{hint}</p>
        </div>
        {extra}
      </header>
      {children}
    </main>
  )
}
