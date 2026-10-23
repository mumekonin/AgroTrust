import { en } from './en'
import { am } from './am'
import { om } from './om'

export type Locale = 'en' | 'am' | 'om'
export type Strings = typeof en

export const locales: Record<Locale, Strings> = { en, am, om }

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  am: 'አማርኛ',
  om: 'Afaan Oromo',
}
