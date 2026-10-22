import { Role } from '../../common/enums/role.enum.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { FarmerStatus, geoChainMatches, phoneShareError } from '../schema/farmer.schema.js';
import { FarmersService } from './farmers.service.js';

const regionId = '64b000000000000000000011';
const zoneId = '64b000000000000000000022';
const woredaId = '64b000000000000000000033';
const kebeleId = '64b000000000000000000044';

describe('farmer registry rules', () => {
  it('accepts a kebele whose path is region, zone, woreda', () => {
    expect(
      geoChainMatches(
        { type: 'kebele', path: [regionId, zoneId, woredaId] },
        { regionId, zoneId, woredaId },
      ),
    ).toBe(true);
  });

  it('rejects a kebele placed in the wrong woreda', () => {
    expect(
      geoChainMatches(
        { type: 'kebele', path: [regionId, zoneId, '64b000000000000000000099'] },
        { regionId, zoneId, woredaId },
      ),
    ).toBe(false);
  });

  it('allows a shared phone up to five farmers and keeps a private phone unique', () => {
    const shared = Array.from({ length: 4 }, () => ({ sharedPhone: true }));
    expect(phoneShareError(shared, true)).toBeNull();
    expect(phoneShareError([...shared, { sharedPhone: true }], true)).toMatch(/5 farmers/);
    expect(phoneShareError([{ sharedPhone: false }], false)).toMatch(/already registered/);
  });
});

describe('FarmersService activation code', () => {
  const farmers = { findById: vi.fn() };
  const activations = { updateMany: vi.fn(), create: vi.fn() };
  const config = { get: vi.fn(() => 'pepper-pepper-pepper-pepper-pepper') };
  const service = new FarmersService(
    farmers as never,
    activations as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    config as never,
  );
  const principal = {
    userId: '64b0000000000000000000aa',
    roles: [Role.NATIONAL_ADMIN],
    scope: { regionIds: [], woredaIds: [], localCenterIds: [] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    activations.updateMany.mockReturnValue({ exec: vi.fn().mockResolvedValue({}) });
    activations.create.mockResolvedValue({});
  });

  it('shows an 8 character code only after the farmer is verified', async () => {
    farmers.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: kebeleId,
        status: FarmerStatus.VERIFIED,
        geo: { regionId },
        localCenterId: regionId,
      }),
    });

    const result = await service.issueActivationCode(principal as never, kebeleId);

    expect(result.activationCode).toHaveLength(8);
    expect(activations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        activationCodeHash: expect.not.stringMatching(result.activationCode),
      }),
    );
  });

  it('refuses a code for a farmer who is not verified', async () => {
    farmers.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: kebeleId,
        status: FarmerStatus.UNLINKED,
        geo: { regionId },
        localCenterId: regionId,
      }),
    });

    await expect(service.issueActivationCode(principal as never, kebeleId)).rejects.toMatchObject({
      code: ErrorCode.CONFLICT,
    });
    expect(activations.create).not.toHaveBeenCalled();
  });
});
