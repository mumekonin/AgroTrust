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

/** In-memory access token storage (design §2.2 / §4.B.6) */
let currentAccessToken: string | null = null

export function setAccessToken(token: string | null) {
  currentAccessToken = token
}

export function getAccessToken(): string | null {
  return currentAccessToken
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
