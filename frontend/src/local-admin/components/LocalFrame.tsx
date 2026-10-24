import type { ReactNode } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { Icon } from '@/shared/ui/Icon'
import { LanguageSwitch } from '@/shared/ui/LanguageSwitch'
import '@/admin/pages/NationalAdminPage.css'

export function LocalFrame({
  title,
  hint,
  query,
  onQuery,
  extra,
  children,
}: {
  title: string
  hint: string
  query: string
  onQuery: (value: string) => void
  extra?: ReactNode
  children: ReactNode
}) {
  const { t } = useLang()
  return (
    <main className="admin__main">
      <div className="admin__top">
        <label className="admin__search">
          <Icon name="search" size="sm" />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={t.localSearch}
            aria-label={t.localSearch}
          />
        </label>
        <LanguageSwitch tone="light" />
        <div className="admin__who">
          <span className="admin__avatar" aria-hidden>
            LA
          </span>
          <span>
            <strong>{t.localRoleLabel}</strong>
            <small>{t.localOversight}</small>
          </span>
        </div>
      </div>
      <header className="admin__head">
        <div>
          <p className="admin__eyebrow">{t.localEyebrow}</p>
          <h1 className="admin__title">{title}</h1>
          <p className="admin__hint">{hint}</p>
        </div>
        {extra}
      </header>
      {children}
    </main>
  )
}
