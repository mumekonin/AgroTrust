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

export function localWrite<T>(path: string, method: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (method === 'POST' || method === 'PUT') headers['Idempotency-Key'] = createIdempotencyKey()
  return apiRequest<T>(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export interface QueueRow {
  id: string
  requestNo: string
  farmerId: string
  seasonId: string
  payableSantim: number
  status: string
  qtyKg: number
}

export function loadQueue(status?: string): Promise<QueueRow[]> {
  const params = new URLSearchParams({ limit: '100' })
  if (status) params.set('status', status)
  return apiRequest<{
    items: Array<{
      id: string
      requestNo: string
      farmerId: string
      seasonId: string
      payableSantim: number
      status: string
      items: Array<{ qtyKg: number; acceptedQtyKg?: number }>
    }>
  }>(`/local-admin/input-requests?${params}`).then((page) =>
    page.items.map((row) => ({
      id: row.id,
      requestNo: row.requestNo,
      farmerId: row.farmerId,
      seasonId: row.seasonId,
      payableSantim: row.payableSantim,
      status: row.status,
      qtyKg: row.items.reduce((sum, item) => sum + (item.acceptedQtyKg ?? item.qtyKg), 0),
    })),
  )
}

export interface NamedOption {
  id: string
  label: string
}

export function loadSeasonOptions(): Promise<NamedOption[]> {
  return apiRequest<{ items: Array<{ id: string; name: string }> }>('/seasons?limit=20').then((page) =>
    page.items.map((row) => ({ id: row.id, label: row.name })),
  )
}

export function loadCenterOptions(): Promise<NamedOption[]> {
  return apiRequest<{ items: Array<{ id: string; code: string; name: string }> }>('/admin/local-centers?limit=100').then(
    (page) => page.items.map((row) => ({ id: row.id, label: `${row.code} · ${row.name}` })),
  )
}

export function loadInputOptions(seasonId: string): Promise<NamedOption[]> {
  return apiRequest<{ items: Array<{ id: string; code: string }> }>(
    `/catalog?seasonId=${encodeURIComponent(seasonId)}&limit=100`,
  ).then((page) => page.items.map((row) => ({ id: row.id, label: row.code })))
}

export interface IncomingShipment {
  id: string
  shipmentNo: string
  status: string
  etaAt?: string
  lines: Array<{ inputId: string; batchId: string; qtyKg: number }>
}

export function loadIncoming(): Promise<IncomingShipment[]> {
  return apiRequest<{
    items: Array<{
      id: string
      shipmentNo: string
      status: string
      etaAt?: string
      lines: Array<{ inputId: string; batchId: string; qtyKg: number }>
      transport?: { driverPhone?: string }
    }>
  }>('/local-admin/shipments?limit=100').then((page) =>
    page.items.map((row) => ({
      id: row.id,
      shipmentNo: row.shipmentNo,
      status: row.status,
      etaAt: row.etaAt,
      lines: row.lines,
    })),
  )
}

export interface StockLine {
  inputId: string
  seasonId: string
  onHandKg: number
  reservedKg: number
  availableKg: number
}

export function loadStock(): Promise<StockLine[]> {
  return apiRequest<{ items: StockLine[] }>('/local-admin/stock').then((page) => page.items)
}

export interface InPersonNote {
  id: string
  event: string
  status: string
  body?: string
  createdAt?: string
}

export function loadInPerson(): Promise<InPersonNote[]> {
  return apiRequest<{
    items: Array<InPersonNote & { phone?: string }>
  }>('/local-admin/notifications?limit=100').then((page) =>
    page.items.map((row) => ({
      id: row.id,
      event: row.event,
      status: row.status,
      body: row.body,
      createdAt: row.createdAt,
    })),
  )
}
