import { apiRequest } from '@/shared/api/client'

export interface Allocation {
  id: string
  farmerId: string
  seasonId: string
  inputId: string
  entitledKg: number
  reservedKg: number
  purchasedKg: number
  remainingKg: number
}

export interface RequestItem {
  inputId: string
  qtyKg: number
  acceptedQtyKg?: number
  unitPriceSantimPerKg: number
  subsidySantimPerKg: number
  lineTotalSantim: number
}

export type RequestStatus =
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REQUISITIONED'
  | 'ACCEPTED'
  | 'PAID'
  | 'IN_TRANSIT'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'REFUNDED'

export interface InputRequest {
  id: string
  requestNo: string
  seasonId: string
  items: RequestItem[]
  payableSantim: number
  status: RequestStatus
  waitlisted: boolean
  rejectionReason?: string
  createdAt?: string
}

export interface FarmerNotification {
  id: string
  event: string
  body?: string
  createdAt?: string
}

export interface CatalogItem {
  id: string
  name: { en: string; am: string; om: string }
  price: {
    unitPriceSantimPerKg: number
    subsidySantimPerKg: number
  } | null
}

export interface Season {
  id: string
  name: string
  status: 'draft' | 'open' | 'closed'
}

interface List<T> {
  items: T[]
}

export function listAllocations(): Promise<List<Allocation>> {
  return apiRequest('/me/allocations?limit=50')
}

export function listMyRequests(): Promise<List<InputRequest>> {
  return apiRequest('/input-requests/me?limit=50')
}

export function listNotifications(): Promise<List<FarmerNotification>> {
  return apiRequest('/me/notifications?limit=50')
}

export function listSeasons(): Promise<List<Season>> {
  return apiRequest('/seasons?limit=50')
}

export function listCatalog(seasonId: string): Promise<List<CatalogItem>> {
  return apiRequest(`/catalog?seasonId=${encodeURIComponent(seasonId)}&limit=50`)
}

export function submitRequest(
  input: {
    seasonId: string
    items: Array<{ inputId: string; qtyKg: number }>
  },
  idempotencyKey: string,
): Promise<InputRequest> {
  return apiRequest('/input-requests', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  })
}
