import { apiRequest, createIdempotencyKey } from '@/shared/api/client'

export interface FarmerRow {
  id: string
  registryId: string
  fullName: string
  status: string
  landHoldingHa: number
  hasAccount: boolean
}

interface List<T> {
  items: T[]
  nextCursor?: string
}

export function loadFarmers(status?: string): Promise<List<FarmerRow>> {
  const params = new URLSearchParams({ limit: '100' })
  if (status) params.set('status', status)
  return apiRequest<
    List<{
      id: string
      registryId: string
      fullName: string
      status: string
      landHoldingHa: number
      userId?: string
      contact?: { phone: string }
    }>
  >(`/local-admin/farmers?${params}`).then((page) => ({
    items: page.items.map((row) => ({
      id: row.id,
      registryId: row.registryId,
      fullName: row.fullName,
      status: row.status,
      landHoldingHa: row.landHoldingHa,
      hasAccount: Boolean(row.userId),
    })),
    nextCursor: page.nextCursor,
  }))
}

export function verifyFarmer(id: string): Promise<void> {
  return apiRequest(`/local-admin/farmers/${id}/verify`, { method: 'PATCH' })
}

export function issueActivationCode(id: string): Promise<{ activationCode: string }> {
  return apiRequest(`/local-admin/farmers/${id}/activation-code`, {
    method: 'POST',
    headers: { 'Idempotency-Key': createIdempotencyKey() },
    body: JSON.stringify({}),
  })
}
