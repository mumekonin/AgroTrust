/**
 * AgroTrust shared API client.
 * Talks to /api/v1, handles RFC 7807 problem details,
 * manages persistent device identity, and supplies idempotency keys.
 */

export interface ApiProblem {
  type?: string
  title: string
  status: number
  detail?: string
  code?: string
  invalidParams?: Array<{ name: string; reason: string }>
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly detail?: string
  readonly problem: ApiProblem

  constructor(problem: ApiProblem) {
    super(problem.detail || problem.title || 'API request failed')
    this.name = 'ApiError'
    this.status = problem.status
    this.code = problem.code
    this.detail = problem.detail
    this.problem = problem
  }
}

/** Stable anonymous device UUID for login & activation device tracking */
export function getOrCreateDeviceId(): string {
  const KEY = 'agrotrust_device_id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem(KEY, id)
  }
  return id
}

/** Human-readable device label */
export function getDeviceLabel(): string {
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'Android Device'
  if (/iphone|ipad/i.test(ua)) return 'iOS Device'
  if (/windows/i.test(ua)) return 'Windows PC'
  if (/macintosh/i.test(ua)) return 'Mac'
  if (/linux/i.test(ua)) return 'Linux Device'
  return 'Web Browser'
}

/** Generate a v4-like idempotency key for state-changing POSTs */
export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'idemp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
}

const CSRF_KEY = 'agrotrust-csrf'

let currentAccessToken: string | null = null
let currentCsrfToken: string | null = readStoredCsrf()

function readStoredCsrf(): string | null {
  try {
    return sessionStorage.getItem(CSRF_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string | null) {
  currentAccessToken = token
}

export function getAccessToken(): string | null {
  return currentAccessToken
}

export function setCsrfToken(token: string | null) {
  currentCsrfToken = token
  try {
    if (token) sessionStorage.setItem(CSRF_KEY, token)
    else sessionStorage.removeItem(CSRF_KEY)
  } catch {
    return
  }
}

function decodePayload(token: string): Record<string, unknown> | null {
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='))
    const parsed: unknown = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

export function readAccessRole(): string | null {
  if (!currentAccessToken) return null
  const role = decodePayload(currentAccessToken)?.role
  return typeof role === 'string' ? role : null
}

function accessTokenFresh(): boolean {
  if (!currentAccessToken) return false
  const exp = decodePayload(currentAccessToken)?.exp
  if (typeof exp !== 'number') return true
  return exp * 1000 > Date.now() + 5_000
}

export async function restoreSession(): Promise<boolean> {
  if (accessTokenFresh()) return true
  setAccessToken(null)
  if (!currentCsrfToken) return false
  try {
    const session = await apiRequest<{ accessToken: string; csrfToken: string }>('/auth/refresh', {
      method: 'POST',
      headers: { 'x-csrf-token': currentCsrfToken },
      body: JSON.stringify({}),
    })
    setAccessToken(session.accessToken)
    setCsrfToken(session.csrfToken)
    return true
  } catch {
    setAccessToken(null)
    setCsrfToken(null)
    return false
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `/api/v1${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  if (currentAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentAccessToken}`)
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends __Host-rt cookies for refresh
  })

  if (!res.ok) {
    let problem: ApiProblem
    try {
      const data = await res.json()
      problem = {
        title: data.title || data.message || `HTTP ${res.status}`,
        status: data.status || res.status,
        detail: data.detail || (Array.isArray(data.message) ? data.message.join(', ') : data.message),
        code: data.code,
        invalidParams: data.invalidParams,
        type: data.type,
      }
    } catch {
      problem = {
        title: res.statusText || 'Request failed',
        status: res.status,
      }
    }
    throw new ApiError(problem)
  }

  if (res.status === 204) {
    return undefined as unknown as T
  }

  return res.json() as Promise<T>
}
