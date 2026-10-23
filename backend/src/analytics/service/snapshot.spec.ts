import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import {
  NATIONAL_GEO_ID,
  SnapshotLevel,
  isShortage,
  mergeCenters,
  mergeDistributors,
  rollup,
  snapshotScope,
  summarize,
  type CenterLine,
} from './snapshot.js';

describe('snapshots', () => {
  const centerId = 'center-1';
  const line: CenterLine = {
    localCenterId: centerId,
    regionId: 'region-1',
    woredaId: 'woreda-1',
    seasonId: 'season-1',
    inputId: 'input-1',
    requestedKg: 100,
    acceptedKg: 80,
    paidKg: 40,
    dispatchedKg: 0,
    receivedKg: 0,
    handedOverKg: 0,
    onHandKg: 0,
    requestCount: 2,
    cycleDays: 6,
    completedCount: 2,
  };

  it('rolls a center total up to the woreda, region and country', () => {
    const rows = rollup([line], []);
    const national = rows.find((row) => row.level === SnapshotLevel.NATIONAL);
    const region = rows.find((row) => row.level === SnapshotLevel.REGION);
    expect(national).toMatchObject({ geoId: NATIONAL_GEO_ID, requestedKg: 100, avgCycleDays: 3 });
    expect(region).toMatchObject({ geoId: 'region-1', acceptedKg: 80 });
    expect(rows.find((row) => row.level === SnapshotLevel.CENTER)?.geoId).toBe(centerId);
  });

  it('keeps distributor kilograms out of the national total', () => {
    const rows = rollup([line], [
      {
        distributorId: 'dist-1',
        seasonId: 'season-1',
        inputId: 'input-1',
        requestedKg: 0,
        acceptedKg: 0,
        paidKg: 0,
        dispatchedKg: 25,
        receivedKg: 25,
      },
    ]);
    expect(rows.find((row) => row.level === SnapshotLevel.NATIONAL)?.dispatchedKg).toBe(0);
    expect(rows.find((row) => row.level === SnapshotLevel.DISTRIBUTOR)).toMatchObject({ geoId: 'dist-1', dispatchedKg: 25 });
  });

  it('combines stock and requests for a known center', () => {
    const places = new Map([[centerId, { regionId: 'region-1', woredaId: 'woreda-1' }]]);
    const [merged] = mergeCenters(
      [
        { localCenterId: centerId, seasonId: 'season-1', inputId: 'input-1', requestedKg: 10, requestCount: 1 },
        { localCenterId: centerId, seasonId: 'season-1', inputId: 'input-1', onHandKg: 4 },
        { localCenterId: 'missing', seasonId: 'season-1', inputId: 'input-1', onHandKg: 9 },
      ],
      places,
    );
    expect(merged).toMatchObject({ requestedKg: 10, onHandKg: 4, requestCount: 1 });
  });

  it('adds distributor shipments onto the accepted quantity', () => {
    const [row] = mergeDistributors([
      {
        distributorId: 'dist-1',
        seasonId: 'season-1',
        inputId: 'input-1',
        requestedKg: 10,
        acceptedKg: 8,
        paidKg: 8,
        dispatchedKg: 0,
        receivedKg: 0,
      },
      {
        distributorId: 'dist-1',
        seasonId: 'season-1',
        inputId: 'input-1',
        requestedKg: 0,
        acceptedKg: 0,
        paidKg: 0,
        dispatchedKg: 5,
        receivedKg: 3,
      },
    ]);
    expect(row).toMatchObject({ acceptedKg: 8, dispatchedKg: 5, receivedKg: 3 });
  });

  it('treats accepted kilograms above received kilograms as a shortage', () => {
    expect(isShortage({ acceptedKg: 8, receivedKg: 3 })).toBe(true);
    expect(isShortage({ acceptedKg: 3, receivedKg: 3 })).toBe(false);
  });

  it('sums the latest rows for an overview', () => {
    const rows = rollup([line], []);
    expect(summarize(rows.filter((row) => row.level === SnapshotLevel.NATIONAL))).toMatchObject({
      requestedKg: 100,
      requestCount: 2,
      avgCycleDays: 3,
    });
  });

  it('limits a local admin to that admin center', () => {
    const center = new Types.ObjectId().toString();
    const principal: Principal = {
      userId: new Types.ObjectId().toString(),
      sid: 'sid',
      role: Role.LOCAL_ADMIN,
      roles: [Role.LOCAL_ADMIN],
      scope: { regionIds: [], woredaIds: [], localCenterIds: [center] },
      ip: '127.0.0.1',
      requestId: 'req',
    };
    expect(snapshotScope(principal)).toEqual({ kind: 'level', level: SnapshotLevel.CENTER, geoIds: [center] });
  });

  it('rejects a distributor with no organization', () => {
    const principal: Principal = {
      userId: new Types.ObjectId().toString(),
      sid: 'sid',
      role: Role.DISTRIBUTOR_STAFF,
      roles: [Role.DISTRIBUTOR_STAFF],
      scope: { regionIds: [], woredaIds: [], localCenterIds: [] },
      ip: '127.0.0.1',
      requestId: 'req',
    };
    expect(() => snapshotScope(principal)).toThrow(expect.objectContaining({ code: ErrorCode.FORBIDDEN }));
  });
});
