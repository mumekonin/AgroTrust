import { useEffect, useId, useRef, useState } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import type { Locale } from '@/shared/i18n/index'
import { Icon } from '@/shared/ui/Icon'
import './LanguageSwitch.css'

const OPTIONS: { id: Locale; short: string }[] = [
  { id: 'en', short: 'EN' },
  { id: 'am', short: 'አማ' },
  { id: 'om', short: 'OM' },
]

export function LanguageSwitch({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { locale, setLocale, t } = useLang()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const current = OPTIONS.find((option) => option.id === locale) ?? OPTIONS[0]
  const names: Record<Locale, string> = {
    en: t.langEn,
    am: t.langAm,
    om: t.langOm,
  }

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className={`lang-switch${tone === 'light' ? ' lang-switch--light' : ''}${open ? ' lang-switch--open' : ''}`}
    >
      <button
        type="button"
        className="lang-switch__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t.languageLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="translate" size="sm" />
        <span className="lang-switch__current" lang={current.id}>
          {current.short}
        </span>
        <Icon name="chevron_right" size="sm" className="lang-switch__caret" />
      </button>
      {open ? (
        <ul id={menuId} className="lang-switch__menu" role="listbox" aria-label={t.languageLabel}>
          {OPTIONS.map((option) => {
            const selected = option.id === locale
            return (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  lang={option.id}
                  className={`lang-switch__option${selected ? ' lang-switch__option--active' : ''}`}
                  onClick={() => {
                    setLocale(option.id)
                    setOpen(false)
                  }}
                >
                  <span className="lang-switch__code">{option.short}</span>
                  <span className="lang-switch__name">{names[option.id]}</span>
                  {selected ? <Icon name="check" size="sm" /> : <span className="lang-switch__check" />}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
