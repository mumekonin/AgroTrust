import { ApiError, apiRequest, createIdempotencyKey } from '@/shared/api/client'

export async function confirmStepUp(password: string, code: string): Promise<void> {
  await apiRequest('/auth/step-up', {
    method: 'POST',
    body: JSON.stringify({ password, code }),
  })
}

export async function adminWrite<T>(path: string, method: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (method === 'POST' || method === 'PUT') headers['Idempotency-Key'] = createIdempotencyKey()
  try {
    return await apiRequest<T>(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    if (err instanceof ApiError && err.code === 'STEP_UP_REQUIRED') {
      throw err
    }
    throw err
  }
}
