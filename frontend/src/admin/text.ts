import { ApiError } from '@/shared/api/client'
import type { Locale } from '@/shared/i18n'

export function when(value: string | undefined, locale: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function share(handedOverKg: number, requestedKg: number): number {
  if (requestedKg <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((handedOverKg / requestedKg) * 100)))
}

export function localized(name: { en: string; am: string; om: string }, locale: Locale): string {
  return name[locale] || name.en
}

export function matches(query: string, ...parts: Array<string | undefined>): boolean {
  if (!query) return true
  const haystack = parts.filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(query)
}

export function problem(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.detail || err.problem.title : fallback
}

export function fraudLabel(type: string, ledger: string): string {
  if (type === 'ledger_drift') return ledger
  return type.replaceAll('_', ' ')
}
