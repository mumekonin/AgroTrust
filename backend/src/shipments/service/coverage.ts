import { createHmac, randomBytes } from 'node:crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface QuantityLine {
  inputId: string;
  qtyKg: number;
}

export interface BatchLine extends QuantityLine {
  batchId: string;
}

export function sumBy<T extends QuantityLine>(lines: T[], key: (line: T) => string): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) totals.set(key(line), (totals.get(key(line)) ?? 0) + line.qtyKg);
  return totals;
}

export function pairsOf(totals: Map<string, number>): { inputId: string; qtyKg: number }[] {
  return [...totals.entries()].map(([inputId, qtyKg]) => ({ inputId, qtyKg }));
}

/** Returns the reduced remaining map, or null when the request does not fit. */
export function coverRequest(remaining: Map<string, number>, needs: QuantityLine[]): Map<string, number> | null {
  for (const need of needs) {
    if (need.qtyKg < 0) return null;
    if ((remaining.get(need.inputId) ?? 0) < need.qtyKg) return null;
  }
  const next = new Map(remaining);
  for (const need of needs) next.set(need.inputId, (next.get(need.inputId) ?? 0) - need.qtyKg);
  return next;
}

export function linesDiffer(dispatched: BatchLine[], received: BatchLine[]): boolean {
  const left = sumBy(dispatched, (line) => `${line.inputId}:${line.batchId}`);
  const right = sumBy(received, (line) => `${line.inputId}:${line.batchId}`);
  if (left.size !== right.size) return true;
  for (const [key, qty] of left) if (right.get(key) !== qty) return true;
  return false;
}

export function newPickupCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

export function hashPickupCode(code: string, pepper: string): string {
  return createHmac('sha256', pepper).update(code).digest('hex');
}
