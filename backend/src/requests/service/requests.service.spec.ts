import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { FarmerStatus } from '../../farmers/schema/farmer.schema.js';
import { SeasonStatus } from '../../seasons/schema/season.schema.js';
import { auditHash } from '../../audit/service/audit-hash.js';
import { RequestStatus } from '../schema/input-request.schema.js';
import {
  formatRequestNo,
  lineAmountError,
  requestPayloadHash,
  requestYearSuffix,
  seasonClosedReason,
} from './request-items.js';
import { RequestsService } from './requests.service.js';

describe('request helpers', () => {
  it('rejects a subsidy above the price and a closed season', () => {
    expect(lineAmountError(2, 100, 150)).toBe('Subsidy cannot exceed the price');
    expect(lineAmountError(2, 100, 40)).toBeNull();
    expect(
      seasonClosedReason(
        {
          status: SeasonStatus.DRAFT,
          requestsOpenAt: new Date('2026-01-01'),
          requestsCloseAt: new Date('2026-02-01'),
        },
        new Date('2026-01-15'),
      ),
    ).toBe('This season is not open');
  });

  it('binds the payload hash to the items and formats the request number', () => {
    const base = {
      farmerId: 'farmer',
      seasonId: 'season',
      items: [
        { inputId: 'b', qtyKg: 10 },
        { inputId: 'a', qtyKg: 5 },
      ],
    };
    expect(requestPayloadHash(base)).toBe(
      requestPayloadHash({ ...base, items: [...base.items].reverse() }),
    );
    expect(requestPayloadHash({ ...base, items: [{ inputId: 'a', qtyKg: 6 }] })).not.toBe(
      requestPayloadHash(base),
    );
    expect(requestYearSuffix('2026-MEHER', new Date())).toBe('26');
    expect(formatRequestNo('26', 123)).toBe('RQ-26-000123');
  });

  it('changes the audit hash when the record changes and ignores key order', () => {
    const left = auditHash('prev', { action: 'REQUEST_APPROVED', seq: 1 });
    const right = auditHash('prev', { seq: 1, action: 'REQUEST_APPROVED' });
    expect(left).toBe(right);
    expect(auditHash('prev', { action: 'REQUEST_REJECTED', seq: 1 })).not.toBe(left);
  });
});

describe('RequestsService', () => {
  const centerId = new Types.ObjectId().toString();
  const farmerId = new Types.ObjectId().toString();
  const requestId = new Types.ObjectId();
  const now = new Date();
  const open = new Date(now.getTime() - 86_400_000);
  const close = new Date(now.getTime() + 86_400_000);
  const farmer = {
    id: farmerId,
    userId: new Types.ObjectId().toString(),
    status: FarmerStatus.VERIFIED,
    fullName: 'Abebe',
    localCenterId: centerId,
    regionId: new Types.ObjectId().toString(),
    kebeleId: new Types.ObjectId().toString(),
    landHoldingHa: 1,
    crops: [],
    phone: '+251911000000',
    smsEnabled: true,
  };
  const existing = {
    _id: requestId,
    requestNo: 'RQ-26-000001',
    farmerId: new Types.ObjectId(farmerId),
    seasonId: new Types.ObjectId(),
    localCenterId: new Types.ObjectId(centerId),
    items: [],
    totalSantim: 1000,
    subsidySantim: 0,
    payableSantim: 1000,
    status: RequestStatus.SUBMITTED,
    waitlisted: false,
    channel: 'self',
    submittedBy: { userId: new Types.ObjectId(farmer.userId), role: Role.FARMER },
    consent: { method: 'app', confirmedAt: now },
    statusHistory: [],
  };

  const requests = { findOne: vi.fn(), findById: vi.fn(), findOneAndUpdate: vi.fn() };
  const connection = {
    startSession: vi.fn(),
  };
  const allocations = { reserve: vi.fn(), release: vi.fn() };
  const farmers = { findOwn: vi.fn(), readRecord: vi.fn() };
  const seasons = { getById: vi.fn() };
  const catalog = { officialPrice: vi.fn() };
  const centers = { assertServes: vi.fn() };
  const users = { getByIdOrFail: vi.fn(), findById: vi.fn() };
  const notifications = { enqueue: vi.fn() };
  const audit = { append: vi.fn() };
  const service = new RequestsService(
    requests as never,
    {} as never,
    connection as never,
    allocations as never,
    farmers as never,
    seasons as never,
    catalog as never,
    centers as never,
    users as never,
    notifications as never,
    {} as never,
    audit as never,
  );

  const farmerPrincipal: Principal = {
    userId: farmer.userId,
    sid: 'sid',
    role: Role.FARMER,
    roles: [Role.FARMER],
    scope: { regionIds: [], woredaIds: [], localCenterIds: [] },
    ip: '127.0.0.1',
    requestId: 'req',
  };
  const admin: Principal = {
    ...farmerPrincipal,
    userId: new Types.ObjectId().toString(),
    role: Role.LOCAL_ADMIN,
    roles: [Role.LOCAL_ADMIN],
    scope: { regionIds: [], woredaIds: [], localCenterIds: [centerId] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    connection.startSession.mockResolvedValue({
      withTransaction: async (fn: () => Promise<void>) => fn(),
      endSession: vi.fn(),
    });
    farmers.findOwn.mockResolvedValue(farmer);
    users.getByIdOrFail.mockResolvedValue({ status: 'active', preferredLanguage: 'en' });
    users.findById.mockResolvedValue({ preferredLanguage: 'en' });
    seasons.getById.mockResolvedValue({
      code: '2026-MEHER',
      status: SeasonStatus.OPEN,
      requestsOpenAt: open,
      requestsCloseAt: close,
    });
    centers.assertServes.mockResolvedValue(undefined);
    catalog.officialPrice.mockResolvedValue({ unitPriceSantimPerKg: 500, subsidySantimPerKg: 100 });
  });

  it('returns the original request when the idempotency key was already used', async () => {
    const query = {
      exec: vi.fn().mockResolvedValue(existing),
      session() {
        return query;
      },
    };
    requests.findOne.mockReturnValue(query);
    const result = await service.submit(
      farmerPrincipal,
      { seasonId: new Types.ObjectId().toString(), items: [{ inputId: new Types.ObjectId().toString(), qtyKg: 10 }] },
      'key-1',
    );
    expect(result.requestNo).toBe('RQ-26-000001');
    expect(allocations.reserve).not.toHaveBeenCalled();
  });

  it('releases quota when a submitted request is rejected', async () => {
    const inputId = new Types.ObjectId();
    requests.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        ...existing,
        status: RequestStatus.SUBMITTED,
        items: [{ inputId, qtyKg: 10 }],
      }),
    });
    farmers.readRecord.mockResolvedValue(farmer);
    requests.findOneAndUpdate.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ ...existing, status: RequestStatus.REJECTED, rejectionReason: 'Land mismatch' }),
    });
    const result = await service.reject(admin, requestId.toString(), 'Land mismatch');
    expect(result.status).toBe(RequestStatus.REJECTED);
    expect(allocations.release).toHaveBeenCalledWith(
      expect.objectContaining({ farmerId, qtyKg: 10, inputId: String(inputId) }),
      expect.anything(),
    );
    expect(notifications.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'REQUEST_REJECTED', params: expect.objectContaining({ reason: 'Land mismatch' }) }),
    );
  });
});
