import { createHash, timingSafeEqual } from 'node:crypto';
import { SeasonStatus } from '../../seasons/schema/season.schema.js';

export function lineAmountError(qtyKg: number, unitPriceSantimPerKg: number, subsidySantimPerKg: number): string | null {
  if (subsidySantimPerKg > unitPriceSantimPerKg) return 'Subsidy cannot exceed the price';
  const lineTotalSantim = qtyKg * unitPriceSantimPerKg;
  const subsidySantim = qtyKg * subsidySantimPerKg;
  if (!Number.isSafeInteger(lineTotalSantim) || !Number.isSafeInteger(subsidySantim)) {
    return 'Amount is too large';
  }
  return null;
}

export function lineAmounts(qtyKg: number, unitPriceSantimPerKg: number, subsidySantimPerKg: number) {
  return {
    lineTotalSantim: qtyKg * unitPriceSantimPerKg,
    subsidySantim: qtyKg * subsidySantimPerKg,
    payableSantim: qtyKg * (unitPriceSantimPerKg - subsidySantimPerKg),
  };
}

export function requestPayloadHash(input: {
  farmerId: string;
  seasonId: string;
  items: { inputId: string; qtyKg: number }[];
}): string {
  const items = [...input.items]
    .map((item) => ({ inputId: item.inputId, qtyKg: item.qtyKg }))
    .sort((left, right) => left.inputId.localeCompare(right.inputId));
  return createHash('sha256')
    .update(JSON.stringify({ farmerId: input.farmerId, seasonId: input.seasonId, items }))
    .digest('hex');
}

export function sameHash(left: string, right?: string): boolean {
  if (!right || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function seasonClosedReason(
  season: { status: string; requestsOpenAt: Date; requestsCloseAt: Date },
  now: Date,
): string | null {
  if (season.status !== SeasonStatus.OPEN) return 'This season is not open';
  const open = new Date(season.requestsOpenAt).getTime();
  const close = new Date(season.requestsCloseAt).getTime();
  if (now.getTime() < open || now.getTime() >= close) return 'Requests are closed for this season';
  return null;
}

export function requestYearSuffix(seasonCode: string, now: Date): string {
  const match = /^(\d{4})/.exec(seasonCode.trim());
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  return String(year % 100).padStart(2, '0');
}

export function formatRequestNo(yearSuffix: string, seq: number): string {
  return `RQ-${yearSuffix}-${String(seq).padStart(6, '0')}`;
}

export function duplicateInputId(items: { inputId: string }[]): boolean {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.inputId)) return true;
    seen.add(item.inputId);
  }
  return false;
}
