import { Types } from 'mongoose';
import { InputCategory } from '../../catalog/schema/input.schema.js';
import { Role } from '../../common/enums/role.enum.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { GeoType } from '../../geo/schema/geo-unit.schema.js';
import { DistributorStatus, DistributorType, servesRegion } from '../schema/distributor.schema.js';
import { DistributorsService } from './distributors.service.js';

const regionId = '64b000000000000000000011';
const otherRegionId = '64b000000000000000000012';
const seasonId = '64b000000000000000000021';
const centerId = '64b000000000000000000031';
const distributorId = '64b000000000000000000041';

describe('distributor rules', () => {
  it('matches a distributor to the center region', () => {
    expect(servesRegion([regionId], regionId)).toBe(true);
    expect(servesRegion([regionId], otherRegionId)).toBe(false);
  });
});

describe('DistributorsService', () => {
  const distributors = { create: vi.fn(), findById: vi.fn() };
  const assignments = { create: vi.fn() };
  const geo = { getById: vi.fn() };
  const seasons = { getById: vi.fn() };
  const centers = { getById: vi.fn() };
  const service = new DistributorsService(
    distributors as never,
    assignments as never,
    geo as never,
    seasons as never,
    centers as never,
  );
  const national = {
    userId: new Types.ObjectId().toString(),
    roles: [Role.NATIONAL_ADMIN],
    scope: { regionIds: [], woredaIds: [], localCenterIds: [] },
  };
  const regional = {
    userId: new Types.ObjectId().toString(),
    roles: [Role.REGIONAL_ADMIN],
    scope: { regionIds: [regionId], woredaIds: [], localCenterIds: [] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    geo.getById.mockResolvedValue({ type: GeoType.REGION });
    seasons.getById.mockResolvedValue({ id: seasonId });
    centers.getById.mockResolvedValue({ id: centerId, geo: { regionId } });
  });

  it('rejects a distributor registered outside the regional admin region', async () => {
    await expect(
      service.create(regional as never, {
        code: 'DIST-1',
        name: 'Oromia Union',
        type: DistributorType.GOVERNMENT,
        licenceNo: 'LIC-1',
        contact: { phone: '0911000000' },
        serviceRegionIds: [otherRegionId],
      }),
    ).rejects.toMatchObject({ code: ErrorCode.FORBIDDEN });
    expect(distributors.create).not.toHaveBeenCalled();
  });

  it('rejects an assignment when the distributor does not serve the center', async () => {
    distributors.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(distributorId),
        status: DistributorStatus.ACTIVE,
        serviceRegionIds: [new Types.ObjectId(otherRegionId)],
      }),
    });

    await expect(
      service.createAssignment(national as never, {
        seasonId,
        localCenterId: centerId,
        inputCategory: InputCategory.FERTILIZER,
        distributorId,
        priority: 1,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    expect(assignments.create).not.toHaveBeenCalled();
  });

  it('records the writing admin as the approver', async () => {
    distributors.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(distributorId),
        status: DistributorStatus.ACTIVE,
        serviceRegionIds: [new Types.ObjectId(regionId)],
      }),
    });
    assignments.create.mockImplementation(async (doc: { setBy: Types.ObjectId }) => ({
      ...doc,
      _id: new Types.ObjectId(),
    }));

    const created = await service.createAssignment(national as never, {
      seasonId,
      localCenterId: centerId,
      inputCategory: InputCategory.SEED,
      distributorId,
      priority: 1,
    });

    expect(created.setBy).toBe(national.userId);
    expect(created.approvedBy).toBe(national.userId);
  });
});
