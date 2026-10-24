import { apiRequest, createIdempotencyKey } from '@/shared/api/client'

export function distWrite<T>(path: string, method: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (method === 'POST' || method === 'PUT') headers['Idempotency-Key'] = createIdempotencyKey()
  return apiRequest<T>(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export interface RequisitionRow {
  id: string
  requisitionNo: string
  status: string
  requestCount: number
  lines: Array<{ inputId: string; requestedKg: number; acceptedKg: number }>
}

export function loadRequisitions(): Promise<RequisitionRow[]> {
  return apiRequest<{ items: RequisitionRow[] }>('/distributor/requisitions?limit=100').then((page) => page.items)
}

export interface EligibilityRow {
  requestNo: string
  fullName: string
  registryId: string
  eligibility: { verified: boolean; withinQuota: boolean; paid: boolean }
}

export function loadRequisitionDetail(id: string): Promise<{ lines: RequisitionRow['lines']; farmers: EligibilityRow[] }> {
  return apiRequest<{
    lines: RequisitionRow['lines']
    farmers: { items: EligibilityRow[] }
  }>(`/distributor/requisitions/${encodeURIComponent(id)}`).then((row) => ({
    lines: row.lines,
    farmers: row.farmers.items,
  }))
}

export interface PaymentLine {
  id: string
  paymentNo: string
  amountSantim: number
  status: string
}

export function loadDistributorPayments(): Promise<PaymentLine[]> {
  return apiRequest<{
    items: Array<PaymentLine & { slipNo?: string; farmerId?: string }>
  }>('/distributor/payments?limit=100').then((page) =>
    page.items.map((row) => ({
      id: row.id,
      paymentNo: row.paymentNo,
      amountSantim: row.amountSantim,
      status: row.status,
    })),
  )
}
