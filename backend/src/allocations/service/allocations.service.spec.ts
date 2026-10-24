import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { AllocationsService } from './allocations.service.js';
import { entitledKg, outsideNationalBounds } from './entitlement.js';

describe('entitledKg', () => {
  const rule = { rateKgPerHa: 100, minKg: 25, maxHa: 5, maxKgPerFarmer: 400 };

  it('floors fractional hectares and clamps to the floor and the cap', () => {
    expect(entitledKg({ ...rule, landHoldingHa: 1.25 })).toBe(125);
    expect(entitledKg({ ...rule, landHoldingHa: 0.1 })).toBe(25);
    expect(entitledKg({ ...rule, landHoldingHa: 10 })).toBe(400);
  });
});

describe('outsideNationalBounds', () => {
  const national = { rateKgPerHa: 100, minKg: 25, maxHa: 5, maxKgPerFarmer: 400 };

  it('allows a narrower regional rule and rejects a more generous one', () => {
    expect(outsideNationalBounds({ ...national, rateKgPerHa: 80, minKg: 10 }, national)).toBeNull();
    expect(outsideNationalBounds({ ...national, minKg: 50 }, national)).toBe('minKg exceeds the national rule');
    expect(outsideNationalBounds({ ...national, cropFilter: 'wheat' }, { ...national, cropFilter: 'teff' })).toBe(
      'cropFilter must match the national rule',
    );
  });
});

describe('AllocationsService quota', () => {
  const id = new Types.ObjectId().toString();
  const updateOne = vi.fn();
  const allocations = { updateOne };
  const service = new AllocationsService(
    {} as never,
    allocations as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => vi.clearAllMocks());

  it('rejects a reserve that does not match the quota condition', async () => {
    updateOne.mockReturnValue({ exec: vi.fn().mockResolvedValue({ matchedCount: 0 }) });
    await expect(
      service.reserve({ farmerId: id, seasonId: id, inputId: id, qtyKg: 30 }, {} as never),
    ).rejects.toMatchObject({ code: ErrorCode.QUOTA_EXCEEDED });
    expect(updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        $expr: { $lte: [{ $add: ['$reservedKg', '$purchasedKg', 30] }, '$entitledKg'] },
      }),
      { $inc: { reservedKg: 30 } },
      { session: {} },
    );
  });

  it('rejects a release when the reserved quantity is too small', async () => {
    updateOne.mockReturnValue({ exec: vi.fn().mockResolvedValue({ matchedCount: 0 }) });
    await expect(
      service.release({ farmerId: id, seasonId: id, inputId: id, qtyKg: 5 }, {} as never),
    ).rejects.toMatchObject({ code: ErrorCode.CONFLICT });
  });
});

describe('AllocationsService rules', () => {
  const userId = new Types.ObjectId().toString();
  const regionId = new Types.ObjectId().toString();
  const rules = { findOne: vi.fn(), findById: vi.fn() };
  const seasons = { getById: vi.fn().mockResolvedValue({ id: 'season' }) };
  const catalog = { requireActiveInput: vi.fn().mockResolvedValue(undefined) };
  const geo = { getById: vi.fn().mockResolvedValue({ type: 'region' }) };
  const service = new AllocationsService(
    rules as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    seasons as never,
    geo as never,
    catalog as never,
    {} as never,
  );
  const regional: Principal = {
    userId,
    sid: 'sid',
    role: Role.REGIONAL_ADMIN,
    roles: [Role.REGIONAL_ADMIN],
    scope: { regionIds: [regionId], woredaIds: [], localCenterIds: [] },
    ip: '127.0.0.1',
    requestId: 'req',
  };

  beforeEach(() => vi.clearAllMocks());

  it('refuses a regional rule when no national rule is approved', async () => {
    rules.findOne.mockReturnValue({ sort: () => ({ exec: vi.fn().mockResolvedValue(null) }) });
    await expect(
      service.createRule(regional, {
        seasonId: new Types.ObjectId().toString(),
        inputId: new Types.ObjectId().toString(),
        regionId,
        rateKgPerHa: 80,
        minKg: 25,
        maxHa: 5,
        maxKgPerFarmer: 400,
        effectiveFrom: '2026-06-01T00:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
  });

  it('refuses a regional admin approving a national rule', async () => {
    rules.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        createdBy: new Types.ObjectId(userId),
        regionId: null,
      }),
    });
    await expect(service.approveRule(regional, new Types.ObjectId().toString())).rejects.toMatchObject({
      code: ErrorCode.FORBIDDEN,
    });
  });
});
