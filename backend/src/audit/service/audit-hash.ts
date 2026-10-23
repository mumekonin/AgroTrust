import { createHash, createHmac } from 'node:crypto';

export const AUDIT_GENESIS = '0'.repeat(64);

/** Stable JSON: sorted keys, dates as ISO strings, undefined keys dropped. */
export function canonical(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function auditHash(prevHash: string, record: Record<string, unknown>): string {
  return createHash('sha256').update(`${prevHash}${canonical(record)}`).digest('hex');
}

export interface ChainLink {
  seq: number;
  at: string;
  actor: { userId: string; role: string; ip: string; userAgent?: string };
  action: string;
  entity: { type: string; id: string };
  changes: Record<string, unknown>;
  requestId: string;
  localCenterId?: string;
  prevHash: string;
  hash: string;
}

export interface ChainWalk {
  intact: boolean;
  seq: number;
  hash: string;
  brokenSeq?: number;
}

/** The same object `AuditService` hashes before insert. */
export function linkRecord(link: Omit<ChainLink, 'prevHash' | 'hash'>): Record<string, unknown> {
  const record: Record<string, unknown> = {
    seq: link.seq,
    at: link.at,
    actor: link.actor,
    action: link.action,
    entity: link.entity,
    changes: link.changes,
    requestId: link.requestId,
  };
  if (link.localCenterId) record.localCenterId = link.localCenterId;
  return record;
}

export function chainAgrees(prevHash: string, link: ChainLink): boolean {
  return link.prevHash === prevHash && auditHash(prevHash, linkRecord(link)) === link.hash;
}

export function walkChain(links: ChainLink[]): ChainWalk {
  let prevHash = AUDIT_GENESIS;
  let seq = 0;
  for (const link of links) {
    if (link.seq !== seq + 1 || !chainAgrees(prevHash, link)) {
      return { intact: false, seq, hash: prevHash, brokenSeq: link.seq };
    }
    prevHash = link.hash;
    seq = link.seq;
  }
  return { intact: true, seq, hash: prevHash };
}

export function signDigest(pepper: string, date: string, seq: number, hash: string): string {
  return createHmac('sha256', pepper).update(`${date}.${seq}.${hash}`).digest('hex');
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
