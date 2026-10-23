import { useLang } from '@/shared/i18n/LangContext'
import { localeLabels, type Locale } from '@/shared/i18n/index'
import './LanguageSwitch.css'

const LOCALES = Object.keys(localeLabels) as Locale[]

export function LanguageSwitch() {
  const { locale, setLocale } = useLang()

  return (
    <div className="lang-switch" role="group" aria-label="Language selector">
      {LOCALES.map((l) => (
        <button
          key={l}
          id={`lang-${l}`}
          className={`lang-switch__btn${l === locale ? ' lang-switch__btn--active' : ''}`}
          onClick={() => setLocale(l)}
          aria-pressed={l === locale}
          lang={l === 'am' ? 'am' : undefined}
        >
          {localeLabels[l]}
        </button>
      ))}
    </div>
  )
}
