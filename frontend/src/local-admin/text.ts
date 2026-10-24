import { ApiError } from '@/shared/api/client'

export function matches(query: string, ...parts: Array<string | undefined>): boolean {
  if (!query) return true
  const haystack = parts.filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(query)
}

export function problem(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.detail || err.problem.title : fallback
}
