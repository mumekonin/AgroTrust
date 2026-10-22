import { Types } from 'mongoose';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CatalogService, pickCurrentPrice, type PriceCandidate } from './catalog.service.js';

const regionId = '64b0000000000000000000aa';
const now = new Date('2026-07-01T00:00:00.000Z');

function price(overrides: Partial<PriceCandidate> = {}): PriceCandidate {
  return {
    id: 'price-1',
    unitPriceSantimPerKg: 5000,
    subsidySantimPerKg: 2000,
    effectiveFrom: new Date('2026-06-01T00:00:00.000Z'),
    approved: true,
    ...overrides,
  };
}

describe('pickCurrentPrice', () => {
  it('uses the regional price ahead of the national one', () => {
    const chosen = pickCurrentPrice(
      [price({ id: 'national' }), price({ id: 'regional', regionId })],
      now,
      regionId,
    );
    expect(chosen?.id).toBe('regional');
  });

  it('ignores a price that is not approved or is no longer in force', () => {
    const chosen = pickCurrentPrice(
      [
        price({ id: 'pending', approved: false }),
        price({ id: 'old', effectiveTo: new Date('2026-06-15T00:00:00.000Z') }),
        price({ id: 'current', effectiveFrom: new Date('2026-06-20T00:00:00.000Z') }),
      ],
      now,
    );
    expect(chosen?.id).toBe('current');
  });

  it('does not return another region price when no region is asked for', () => {
    expect(pickCurrentPrice([price({ regionId })], now)).toBeNull();
  });
});

describe('CatalogService prices', () => {
  const inputs = { findById: vi.fn() };
  const prices = { create: vi.fn(), findById: vi.fn() };
  const geo = { getById: vi.fn() };
  const seasons = { getById: vi.fn() };
  const service = new CatalogService(inputs as never, prices as never, geo as never, seasons as never);
  const setter = new Types.ObjectId().toString();
  const approver = new Types.ObjectId().toString();
  const inputId = new Types.ObjectId().toString();
  const seasonId = new Types.ObjectId().toString();

  const body = {
    inputId,
    seasonId,
    unitPriceSantimPerKg: 5000,
    subsidySantimPerKg: 2000,
    effectiveFrom: '2026-06-01T00:00:00.000Z',
    reason: 'Ministry notice',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    inputs.findById.mockReturnValue({
      select: () => ({ lean: () => ({ exec: vi.fn().mockResolvedValue({ _id: inputId }) }) }),
    });
    seasons.getById.mockResolvedValue({ id: seasonId });
    prices.create.mockImplementation(async (doc: { setBy: Types.ObjectId }) => ({
      id: 'price-1',
      ...doc,
    }));
  });

  it('rejects a subsidy larger than the price', async () => {
    await expect(
      service.recordPrice(setter, { ...body, subsidySantimPerKg: 6000 }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    expect(prices.create).not.toHaveBeenCalled();
  });

  it('records a price without an approver', async () => {
    const result = await service.recordPrice(setter, body);
    expect(result.approvedBy).toBeUndefined();
    expect(result.setBy).toBe(setter);
    expect(result.unitPriceSantimPerKg).toBe(5000);
  });

  it('refuses the author as the second approver', async () => {
    prices.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ setBy: new Types.ObjectId(setter), save: vi.fn() }),
    });
    await expect(service.approvePrice(setter, new Types.ObjectId().toString())).rejects.toMatchObject({
      code: ErrorCode.FORBIDDEN,
    });
  });

  it('lets a different national admin approve', async () => {
    const doc = {
      _id: new Types.ObjectId(),
      inputId: new Types.ObjectId(inputId),
      seasonId: new Types.ObjectId(seasonId),
      unitPriceSantimPerKg: 5000,
      subsidySantimPerKg: 2000,
      effectiveFrom: now,
      setBy: new Types.ObjectId(setter),
      reason: 'Ministry notice',
      approvedBy: undefined as Types.ObjectId | undefined,
      save: vi.fn(),
    };
    prices.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(doc) });

    const result = await service.approvePrice(approver, doc._id.toString());

    expect(String(doc.approvedBy)).toBe(approver);
    expect(doc.save).toHaveBeenCalled();
    expect(result.approvedBy).toBe(approver);
  });
});
