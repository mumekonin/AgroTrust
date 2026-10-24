import type { Strings } from '@/shared/i18n'
import type { RequestStatus } from './api'

const STOPPED = new Set<RequestStatus>(['REJECTED', 'CANCELLED', 'DECLINED', 'EXPIRED', 'REFUNDED'])

const STEP: Partial<Record<RequestStatus, number>> = {
  SUBMITTED: 1,
  APPROVED: 2,
  REQUISITIONED: 3,
  ACCEPTED: 4,
  PAID: 5,
  IN_TRANSIT: 6,
  READY_FOR_PICKUP: 7,
  COMPLETED: 9,
}

export function isStopped(status: RequestStatus): boolean {
  return STOPPED.has(status)
}

export function stepFor(status: RequestStatus): number {
  return STEP[status] ?? 0
}

export function statusLabel(status: RequestStatus, t: Strings): string {
  switch (status) {
    case 'SUBMITTED':
      return t.statusSubmitted
    case 'APPROVED':
      return t.statusApproved
    case 'REQUISITIONED':
      return t.statusRequisitioned
    case 'ACCEPTED':
      return t.statusAccepted
    case 'PAID':
      return t.statusPaid
    case 'IN_TRANSIT':
      return t.statusInTransit
    case 'READY_FOR_PICKUP':
      return t.statusReady
    case 'COMPLETED':
      return t.statusCompleted
    case 'REJECTED':
      return t.statusRejected
    case 'CANCELLED':
      return t.statusCancelled
    case 'DECLINED':
      return t.statusDeclined
    case 'EXPIRED':
      return t.statusExpired
    case 'REFUNDED':
      return t.statusRefunded
  }
}

export function stepLabels(t: Strings): string[] {
  return [
    t.farmerStepRequest,
    t.farmerStepReview,
    t.farmerStepRequisition,
    t.farmerStepAccepted,
    t.farmerStepPayment,
    t.farmerStepTransit,
    t.farmerStepCollect,
    t.farmerStepDone,
  ]
}
