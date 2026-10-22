import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UserStatus } from '../../users/schema/user.schema.js';
import {
  canAssignCenter,
  centerGeoMatches,
  kebeleInRegion,
} from '../schema/local-center.schema.js';
import { LocalCentersService } from './local-centers.service.js';

const regionId = '64b000000000000000000011';
const zoneId = '64b000000000000000000022';
const woredaId = '64b000000000000000000033';
const kebeleId = '64b000000000000000000044';

describe('local center rules', () => {
  it('accepts a center kebele on the region, zone, woreda path', () => {
    expect(
      centerGeoMatches({ type: 'kebele', path: [regionId, zoneId, woredaId] }, { regionId, zoneId, woredaId }),
    ).toBe(true);
    expect(kebeleInRegion({ type: 'kebele', path: [regionId, zoneId, woredaId] }, regionId)).toBe(true);
    expect(kebeleInRegion({ type: 'woreda', path: [regionId, zoneId] }, regionId)).toBe(false);
  });

  it('lets a local admin cover three centers and no more', () => {
    const held = ['a', 'b', 'c'];
    expect(canAssignCenter(held, 'a')).toBe(true);
    expect(canAssignCenter(held)).toBe(false);
    expect(canAssignCenter(['a', 'b'])).toBe(true);
  });
});

describe('LocalCentersService', () => {
  const centers = { create: vi.fn() };
  const geo = { getById: vi.fn() };
  const users = { getByIdOrFail: vi.fn() };
  const service = new LocalCentersService(centers as never, geo as never, users as never);
  const principal = {
    userId: new Types.ObjectId().toString(),
    roles: [Role.NATIONAL_ADMIN],
    scope: { regionIds: [], woredaIds: [], localCenterIds: [] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    geo.getById.mockResolvedValue({ type: 'kebele', path: [regionId, zoneId, woredaId] });
  });

  it('rejects a fourth center for one local admin', async () => {
    users.getByIdOrFail.mockResolvedValue({
      id: new Types.ObjectId().toString(),
      roles: [Role.LOCAL_ADMIN],
      status: UserStatus.ACTIVE,
      scope: {
        regionIds: [],
        woredaIds: [],
        localCenterIds: [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()],
      },
    });

    await expect(
      service.create(principal as never, {
        code: 'LC-1',
        name: 'Bishoftu depot',
        geo: { regionId, zoneId, woredaId, kebeleId },
        location: { type: 'Point', coordinates: [38.98, 8.75] },
        address: 'Main road',
        openingHours: '08:30-17:30',
        localAdminUserIds: [new Types.ObjectId().toString()],
        servesKebeleIds: [kebeleId],
      }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    expect(centers.create).not.toHaveBeenCalled();
  });
});
