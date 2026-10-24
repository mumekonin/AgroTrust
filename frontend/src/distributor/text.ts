import { ApiError } from '@/shared/api/client'

export function problem(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.detail || err.problem.title : fallback
}
