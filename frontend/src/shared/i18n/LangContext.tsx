import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { locales, localeLabels, type Locale, type Strings } from './index'

interface LangContextValue {
  locale: Locale
  t: Strings
  labels: typeof localeLabels
  setLocale: (l: Locale) => void
}

const LangContext = createContext<LangContextValue | null>(null)

function detectLocale(): Locale {
  const stored = localStorage.getItem('agrotrust-lang')
  if (stored === 'am' || stored === 'om' || stored === 'en') return stored
  const browser = navigator.language.slice(0, 2)
  if (browser === 'am') return 'am'
  if (browser === 'om') return 'om'
  return 'en'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem('agrotrust-lang', l)
    setLocaleState(l)
  }, [])

  const value = useMemo<LangContextValue>(
    () => ({ locale, t: locales[locale], labels: localeLabels, setLocale }),
    [locale, setLocale],
  )

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside LangProvider')
  return ctx
}
