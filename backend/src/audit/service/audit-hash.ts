import { createHash } from 'node:crypto';

export const AUDIT_GENESIS = '0'.repeat(64);

/** Stable JSON: sorted keys, dates as ISO strings, undefined keys dropped. */
export function canonical(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function auditHash(prevHash: string, record: Record<string, unknown>): string {
  return createHash('sha256').update(`${prevHash}${canonical(record)}`).digest('hex');
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => normalize(item));
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] !== undefined) sorted[key] = normalize(source[key]);
    }
    return sorted;
  }
  return value;
}
