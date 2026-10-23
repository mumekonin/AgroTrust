import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';

export const NATIONAL_GEO_ID = 'national';

export const SnapshotLevel = {
  NATIONAL: 'national',
  REGION: 'region',
  WOREDA: 'woreda',
  CENTER: 'center',
  DISTRIBUTOR: 'distributor',
} as const;

export type SnapshotLevel = (typeof SnapshotLevel)[keyof typeof SnapshotLevel];

export interface QuantitySet {
  requestedKg: number;
  acceptedKg: number;
  paidKg: number;
  dispatchedKg: number;
  receivedKg: number;
  handedOverKg: number;
  onHandKg: number;
  requestCount: number;
  cycleDays: number;
  completedCount: number;
}

export interface CenterContribution extends Partial<QuantitySet> {
  localCenterId: string;
  seasonId: string;
  inputId: string;
}

export interface CenterLine extends QuantitySet {
  localCenterId: string;
  regionId: string;
  woredaId: string;
  seasonId: string;
  inputId: string;
}

export interface DistributorLine {
  distributorId: string;
  seasonId: string;
  inputId: string;
  requestedKg: number;
  acceptedKg: number;
  paidKg: number;
  dispatchedKg: number;
  receivedKg: number;
}

export interface SnapshotRow {
  level: SnapshotLevel;
  geoId: string;
  inputId: string;
  seasonId: string;
  requestedKg: number;
  acceptedKg: number;
  paidKg: number;
  dispatchedKg: number;
  receivedKg: number;
  handedOverKg: number;
  onHandKg: number;
  requestCount: number;
  avgCycleDays: number;
}

export interface SnapshotSummary {
  requestedKg: number;
  acceptedKg: number;
  paidKg: number;
  dispatchedKg: number;
  receivedKg: number;
  handedOverKg: number;
  onHandKg: number;
  requestCount: number;
  avgCycleDays: number;
}

export type SnapshotScope = { kind: 'all' } | { kind: 'level'; level: SnapshotLevel; geoIds: string[] };

const EMPTY: QuantitySet = {
  requestedKg: 0,
  acceptedKg: 0,
  paidKg: 0,
  dispatchedKg: 0,
  receivedKg: 0,
  handedOverKg: 0,
  onHandKg: 0,
  requestCount: 0,
  cycleDays: 0,
  completedCount: 0,
};

export function snapshotScope(principal: Principal): SnapshotScope {
  if (principal.roles.includes(Role.NATIONAL_ADMIN) || principal.roles.includes(Role.AUDITOR)) return { kind: 'all' };
  if (principal.roles.includes(Role.REGIONAL_ADMIN)) {
    return { kind: 'level', level: SnapshotLevel.REGION, geoIds: principal.scope.regionIds };
  }
  if (principal.roles.includes(Role.LOCAL_ADMIN)) {
    return { kind: 'level', level: SnapshotLevel.CENTER, geoIds: principal.scope.localCenterIds };
  }
  if (principal.roles.includes(Role.DISTRIBUTOR_STAFF) && principal.scope.distributorId) {
    return { kind: 'level', level: SnapshotLevel.DISTRIBUTOR, geoIds: [principal.scope.distributorId] };
  }
  throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
}

export function isShortage(row: Pick<SnapshotRow, 'acceptedKg' | 'receivedKg'>): boolean {
  return row.acceptedKg > row.receivedKg;
}

export function summarize(rows: SnapshotRow[]): SnapshotSummary {
  const totals = { ...EMPTY };
  for (const row of rows) {
    totals.requestedKg += row.requestedKg;
    totals.acceptedKg += row.acceptedKg;
    totals.paidKg += row.paidKg;
    totals.dispatchedKg += row.dispatchedKg;
    totals.receivedKg += row.receivedKg;
    totals.handedOverKg += row.handedOverKg;
    totals.onHandKg += row.onHandKg;
    totals.requestCount += row.requestCount;
    totals.cycleDays += row.avgCycleDays * row.requestCount;
    totals.completedCount += row.requestCount;
  }
  return {
    requestedKg: totals.requestedKg,
    acceptedKg: totals.acceptedKg,
    paidKg: totals.paidKg,
    dispatchedKg: totals.dispatchedKg,
    receivedKg: totals.receivedKg,
    handedOverKg: totals.handedOverKg,
    onHandKg: totals.onHandKg,
    requestCount: totals.requestCount,
    avgCycleDays: totals.completedCount ? Math.round(totals.cycleDays / totals.completedCount) : 0,
  };
}

export function mergeCenters(
  parts: CenterContribution[],
  places: Map<string, { regionId: string; woredaId: string }>,
): CenterLine[] {
  const buckets = new Map<string, CenterLine>();
  for (const part of parts) {
    const place = places.get(part.localCenterId);
    if (!place) continue;
    const key = `${part.localCenterId}|${part.seasonId}|${part.inputId}`;
    const bucket = buckets.get(key) ?? {
      ...EMPTY,
      localCenterId: part.localCenterId,
      regionId: place.regionId,
      woredaId: place.woredaId,
      seasonId: part.seasonId,
      inputId: part.inputId,
    };
    add(bucket, part);
    buckets.set(key, bucket);
  }
  return [...buckets.values()];
}

export function mergeDistributors(parts: DistributorLine[]): DistributorLine[] {
  const buckets = new Map<string, DistributorLine>();
  for (const part of parts) {
    const key = `${part.distributorId}|${part.seasonId}|${part.inputId}`;
    const bucket = buckets.get(key) ?? {
      distributorId: part.distributorId,
      seasonId: part.seasonId,
      inputId: part.inputId,
      requestedKg: 0,
      acceptedKg: 0,
      paidKg: 0,
      dispatchedKg: 0,
      receivedKg: 0,
    };
    bucket.requestedKg += part.requestedKg;
    bucket.acceptedKg += part.acceptedKg;
    bucket.paidKg += part.paidKg;
    bucket.dispatchedKg += part.dispatchedKg;
    bucket.receivedKg += part.receivedKg;
    buckets.set(key, bucket);
  }
  return [...buckets.values()];
}

export function rollup(centers: CenterLine[], distributors: DistributorLine[]): SnapshotRow[] {
  return [
    ...groupCenters(centers, SnapshotLevel.CENTER, (line) => line.localCenterId),
    ...groupCenters(centers, SnapshotLevel.WOREDA, (line) => line.woredaId),
    ...groupCenters(centers, SnapshotLevel.REGION, (line) => line.regionId),
    ...groupCenters(centers, SnapshotLevel.NATIONAL, () => NATIONAL_GEO_ID),
    ...groupDistributors(distributors),
  ].filter(hasWeight);
}

function groupCenters(lines: CenterLine[], level: SnapshotLevel, geoOf: (line: CenterLine) => string): SnapshotRow[] {
  const buckets = new Map<string, QuantitySet & { geoId: string; seasonId: string; inputId: string }>();
  for (const line of lines) {
    const geoId = geoOf(line);
    const key = `${geoId}|${line.seasonId}|${line.inputId}`;
    const bucket = buckets.get(key) ?? { ...EMPTY, geoId, seasonId: line.seasonId, inputId: line.inputId };
    add(bucket, line);
    buckets.set(key, bucket);
  }
  return [...buckets.values()].map((bucket) => toRow(level, bucket));
}

function groupDistributors(lines: DistributorLine[]): SnapshotRow[] {
  return lines.map((line) =>
    toRow(SnapshotLevel.DISTRIBUTOR, {
      ...EMPTY,
      geoId: line.distributorId,
      seasonId: line.seasonId,
      inputId: line.inputId,
      requestedKg: line.requestedKg,
      acceptedKg: line.acceptedKg,
      paidKg: line.paidKg,
      dispatchedKg: line.dispatchedKg,
      receivedKg: line.receivedKg,
    }),
  );
}

function toRow(level: SnapshotLevel, bucket: QuantitySet & { geoId: string; seasonId: string; inputId: string }): SnapshotRow {
  return {
    level,
    geoId: bucket.geoId,
    inputId: bucket.inputId,
    seasonId: bucket.seasonId,
    requestedKg: bucket.requestedKg,
    acceptedKg: bucket.acceptedKg,
    paidKg: bucket.paidKg,
    dispatchedKg: bucket.dispatchedKg,
    receivedKg: bucket.receivedKg,
    handedOverKg: bucket.handedOverKg,
    onHandKg: bucket.onHandKg,
    requestCount: bucket.requestCount,
    avgCycleDays: bucket.completedCount ? Math.round(bucket.cycleDays / bucket.completedCount) : 0,
  };
}

function add(bucket: QuantitySet, part: Partial<QuantitySet>): void {
  bucket.requestedKg += part.requestedKg ?? 0;
  bucket.acceptedKg += part.acceptedKg ?? 0;
  bucket.paidKg += part.paidKg ?? 0;
  bucket.dispatchedKg += part.dispatchedKg ?? 0;
  bucket.receivedKg += part.receivedKg ?? 0;
  bucket.handedOverKg += part.handedOverKg ?? 0;
  bucket.onHandKg += part.onHandKg ?? 0;
  bucket.requestCount += part.requestCount ?? 0;
  bucket.cycleDays += Math.max(0, part.cycleDays ?? 0);
  bucket.completedCount += part.completedCount ?? 0;
}

function hasWeight(row: SnapshotRow): boolean {
  return (
    row.requestedKg +
      row.acceptedKg +
      row.paidKg +
      row.dispatchedKg +
      row.receivedKg +
      row.handedOverKg +
      row.onHandKg +
      row.requestCount >
    0
  );
}
