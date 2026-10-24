import { en } from './en'
import { am } from './am'
import { om } from './om'

export type Locale = 'en' | 'am' | 'om'
export type Strings = Record<keyof typeof en, string>

export const locales: Record<Locale, Strings> = { en, am, om }

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  am: 'አማርኛ',
  om: 'Afaan Oromo',
}
