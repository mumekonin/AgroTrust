export const REQUISITION_CHUNK = 300;

export function paymentReference(requestNo: string): string {
  return requestNo.startsWith('RQ-') ? `PY-${requestNo.slice(3)}` : `PY-${requestNo}`;
}

/** Santim stays an integer. The SMS shows birr. */
export function formatBirr(santim: number): string {
  const sign = santim < 0 ? '-' : '';
  const absolute = Math.abs(santim);
  const birr = Math.trunc(absolute / 100);
  const rest = absolute % 100;
  return `${sign}${birr}.${String(rest).padStart(2, '0')}`;
}

export function payableSantim(
  items: { acceptedQtyKg: number; unitPriceSantimPerKg: number; subsidySantimPerKg: number }[],
): number {
  return items.reduce(
    (sum, item) => sum + item.acceptedQtyKg * (item.unitPriceSantimPerKg - item.subsidySantimPerKg),
    0,
  );
}

export type RequisitionDecision = 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'DECLINED';

export function decisionFor(lines: { requestedKg: number; acceptedKg: number }[]): RequisitionDecision {
  if (lines.length === 0) return 'DECLINED';
  if (lines.every((line) => line.acceptedKg === 0)) return 'DECLINED';
  if (lines.every((line) => line.acceptedKg === line.requestedKg)) return 'ACCEPTED';
  return 'PARTIALLY_ACCEPTED';
}

export function lineError(lines: { requestedKg: number; acceptedKg: number }[]): string | null {
  if (lines.length === 0) return 'A response needs one line for each input';
  for (const line of lines) {
    if (!Number.isInteger(line.acceptedKg) || line.acceptedKg < 0) return 'acceptedKg must be a whole number';
    if (line.acceptedKg > line.requestedKg) return 'acceptedKg cannot exceed the requested quantity';
  }
  return null;
}

export interface SupplyRequest {
  id: string;
  items: { inputId: string; qtyKg: number }[];
}

export interface SupplyDecision {
  id: string;
  accepted: { inputId: string; acceptedQtyKg: number }[];
  covered: boolean;
}

/** Requests must already be in priority order. Covered means the farmer receives some quantity. */
export function allocateSupply(
  requests: SupplyRequest[],
  remainingKg: Map<string, number>,
): SupplyDecision[] {
  const remaining = new Map(remainingKg);
  return requests.map((request) => {
    const accepted = request.items.map((item) => {
      const left = remaining.get(item.inputId) ?? 0;
      const acceptedQtyKg = Math.min(item.qtyKg, Math.max(left, 0));
      remaining.set(item.inputId, left - acceptedQtyKg);
      return { inputId: item.inputId, acceptedQtyKg };
    });
    return { id: request.id, accepted, covered: accepted.some((item) => item.acceptedQtyKg > 0) };
  });
}

export function compareApprovalTime(
  left: { reviewedAt?: Date; id: string },
  right: { reviewedAt?: Date; id: string },
): number {
  const byTime = (left.reviewedAt?.getTime() ?? 0) - (right.reviewedAt?.getTime() ?? 0);
  if (byTime !== 0) return byTime;
  return left.id.localeCompare(right.id);
}

export function compareSmallestLand(
  left: { landHoldingHa: number; reviewedAt?: Date; id: string },
  right: { landHoldingHa: number; reviewedAt?: Date; id: string },
): number {
  if (left.landHoldingHa !== right.landHoldingHa) return left.landHoldingHa - right.landHoldingHa;
  return compareApprovalTime(left, right);
}
