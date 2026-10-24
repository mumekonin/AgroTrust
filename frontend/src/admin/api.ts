import { apiRequest } from '@/shared/api/client'

export interface Pipeline {
  date: string
  requestedKg: number
  acceptedKg: number
  paidKg: number
  dispatchedKg: number
  receivedKg: number
  handedOverKg: number
  onHandKg: number
  requestCount: number
  avgCycleDays: number
}

export interface RegionLine {
  geoId: string
  requestedKg: number
  handedOverKg: number
  acceptedKg: number
  receivedKg: number
  requestCount: number
}

export interface SeasonRow {
  id: string
  code: string
  name: string
  status: 'draft' | 'open' | 'closed'
  startsAt: string
  endsAt: string
  requestsOpenAt: string
  requestsCloseAt: string
  paymentWindowDays: number
  pickupWindowDays: number
}

export interface GeoRow {
  id: string
  code: string
  name: { en: string; am: string; om: string }
}

export interface CenterRow {
  id: string
  code: string
  name: string
  address: string
  status: 'active' | 'suspended'
  regionId: string
  kebeleCount: number
  openingHours: string
}

export interface DistributorRow {
  id: string
  code: string
  name: string
  type: 'government' | 'private'
  status: 'active' | 'suspended'
  regionCount: number
}

export interface FraudRow {
  id: string
  type: string
  severity: string
  status: 'open' | 'reviewing' | 'resolved'
  createdAt?: string
}

export interface AuditRow {
  seq: number
  at: string
  action: string
  entityType: string
}

export interface PriceRow {
  id: string
  code: string
  name: { en: string; am: string; om: string }
  unitPriceSantimPerKg: number
  subsidySantimPerKg: number
}

export interface PageCount {
  count: number
  more: boolean
}

interface List<T> {
  items: T[]
  nextCursor?: string
}

export function loadPipeline(seasonId?: string): Promise<Pipeline> {
  const params = new URLSearchParams()
  if (seasonId) params.set('seasonId', seasonId)
  const query = params.toString()
  return apiRequest(`/admin/analytics/overview${query ? `?${query}` : ''}`)
}

export function loadRegionLines(seasonId?: string): Promise<{ date: string; items: RegionLine[] }> {
  const params = new URLSearchParams({ level: 'region' })
  if (seasonId) params.set('seasonId', seasonId)
  return apiRequest<{ date: string; items: SnapshotItem[] }>(`/admin/analytics/pipeline?${params}`).then(
    (page) => ({ date: page.date, items: groupRegions(page.items) }),
  )
}

export function loadSeasons(): Promise<List<SeasonRow>> {
  return apiRequest('/seasons?limit=20')
}

export function loadRegions(): Promise<List<GeoRow>> {
  return apiRequest('/geo?limit=100')
}

export function loadCenters(): Promise<List<CenterRow>> {
  return apiRequest<
    List<{
      id: string
      code: string
      name: string
      address: string
      status: 'active' | 'suspended'
      geo: { regionId: string }
      servesKebeleIds?: string[]
      openingHours: string
    }>
  >('/admin/local-centers?limit=100').then((page) => ({
    items: page.items.map((center) => ({
      id: center.id,
      code: center.code,
      name: center.name,
      address: center.address,
      status: center.status,
      regionId: center.geo.regionId,
      kebeleCount: center.servesKebeleIds?.length ?? 0,
      openingHours: center.openingHours,
    })),
    nextCursor: page.nextCursor,
  }))
}

export function loadDistributors(): Promise<List<DistributorRow>> {
  return apiRequest<
    List<DistributorRow & { contact?: { phone: string }; bankAccountRef?: string; serviceRegionIds?: string[] }>
  >('/admin/distributors?limit=100').then((page) => ({
    items: page.items.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      status: row.status,
      regionCount: row.serviceRegionIds?.length ?? 0,
    })),
    nextCursor: page.nextCursor,
  }))
}

export function loadFraud(status?: FraudRow['status']): Promise<List<FraudRow>> {
  const params = new URLSearchParams({ limit: '100' })
  if (status) params.set('status', status)
  return apiRequest<List<FraudRow & { details?: unknown }>>(`/admin/fraud-flags?${params}`).then(
    (page) => ({
      items: page.items.map((row) => ({
        id: row.id,
        type: row.type,
        severity: row.severity,
        status: row.status,
        createdAt: row.createdAt,
      })),
      nextCursor: page.nextCursor,
    }),
  )
}

export function loadAudit(): Promise<List<AuditRow>> {
  return apiRequest<
    List<{ seq: number; at: string; action: string; entity?: { type: string }; hash?: string }>
  >('/admin/audit-logs?limit=100').then((page) => ({
    items: page.items.map((row) => ({
      seq: row.seq,
      at: row.at,
      action: row.action,
      entityType: row.entity?.type ?? '',
    })),
    nextCursor: page.nextCursor,
  }))
}

export function loadPrices(seasonId: string): Promise<PriceRow[]> {
  return apiRequest<
    List<{
      id: string
      code: string
      name: { en: string; am: string; om: string }
      price: { unitPriceSantimPerKg: number; subsidySantimPerKg: number } | null
    }>
  >(`/catalog?seasonId=${encodeURIComponent(seasonId)}&limit=100`).then((page) =>
    page.items
      .filter((item) => item.price)
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        unitPriceSantimPerKg: item.price?.unitPriceSantimPerKg ?? 0,
        subsidySantimPerKg: item.price?.subsidySantimPerKg ?? 0,
      })),
  )
}

export function loadVerifiedCount(): Promise<PageCount> {
  return apiRequest<List<unknown>>('/local-admin/farmers?status=verified&limit=100').then((page) => ({
    count: page.items.length,
    more: Boolean(page.nextCursor),
  }))
}

interface SnapshotItem {
  geoId: string
  requestedKg: number
  handedOverKg: number
  acceptedKg: number
  receivedKg: number
  requestCount: number
}

function groupRegions(items: SnapshotItem[]): RegionLine[] {
  const buckets = new Map<string, RegionLine>()
  for (const row of items) {
    const current = buckets.get(row.geoId) ?? {
      geoId: row.geoId,
      requestedKg: 0,
      handedOverKg: 0,
      acceptedKg: 0,
      receivedKg: 0,
      requestCount: 0,
    }
    current.requestedKg += row.requestedKg
    current.handedOverKg += row.handedOverKg
    current.acceptedKg += row.acceptedKg
    current.receivedKg += row.receivedKg
    current.requestCount += row.requestCount
    buckets.set(row.geoId, current)
  }
  return [...buckets.values()].sort((left, right) => right.handedOverKg - left.handedOverKg)
}
