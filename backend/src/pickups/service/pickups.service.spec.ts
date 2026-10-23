import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { RequestStatus } from '../../requests/schema/input-request.schema.js';
import { hashPickupCode } from '../../shipments/service/coverage.js';
import { PickupsService } from './pickups.service.js';

describe('PickupsService', () => {
  const pepper = 'pepper-pepper-pepper-pepper-pepper';
  const centerId = new Types.ObjectId().toString();
  const requests = { findByNo: vi.fn(), findById: vi.fn(), recordFailure: vi.fn(), markCompleted: vi.fn() };
  const stock = { issue: vi.fn() };
  const allocations = { purchase: vi.fn() };
  const shipments = { receivedByForRequest: vi.fn() };
  const handle = {
    endSession: vi.fn(),
    withTransaction: async (fn: () => Promise<unknown>) => fn(),
  };
  const connection = { startSession: vi.fn(async () => handle) };
  const service = new PickupsService(
    {} as never,
    connection as never,
    requests as never,
    stock as never,
    allocations as never,
    shipments as never,
    { open: vi.fn() } as never,
    {} as never,
    {} as never,
    {} as never,
    { get: vi.fn(() => pepper) } as never,
  );
  const localAdmin: Principal = {
    userId: new Types.ObjectId().toString(),
    sid: 'sid',
    role: Role.LOCAL_ADMIN,
    roles: [Role.LOCAL_ADMIN],
    scope: { regionIds: [], woredaIds: [], localCenterIds: [centerId] },
    ip: '127.0.0.1',
    requestId: 'req',
  };
  const ready = {
    id: new Types.ObjectId().toString(),
    requestNo: 'RQ-26-000123',
    farmerId: new Types.ObjectId().toString(),
    seasonId: new Types.ObjectId().toString(),
    localCenterId: centerId,
    status: RequestStatus.READY_FOR_PICKUP,
    waitlisted: false,
    pickupAttempts: 0,
    pickupCodeHash: undefined as string | undefined,
    pickupExpiresAt: new Date(Date.now() + 86_400_000),
    items: [{ inputId: new Types.ObjectId().toString(), qtyKg: 10 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    requests.findByNo.mockResolvedValue(ready);
  });

  it('rejects a pickup for another center', async () => {
    requests.findByNo.mockResolvedValue({ ...ready, localCenterId: new Types.ObjectId().toString() });
    await expect(service.verify(localAdmin, { requestNo: ready.requestNo, code: 'ABCD2345' })).rejects.toMatchObject({
      code: ErrorCode.FORBIDDEN,
    });
    expect(requests.recordFailure).not.toHaveBeenCalled();
  });

  it('records a wrong pickup code and does not complete', async () => {
    requests.recordFailure.mockResolvedValue(true);
    await expect(service.verify(localAdmin, { requestNo: ready.requestNo, code: 'ABCD2345' })).rejects.toMatchObject({
      code: ErrorCode.PICKUP_CODE_INVALID,
    });
    expect(requests.recordFailure).toHaveBeenCalledWith(ready.id);
    expect(requests.markCompleted).not.toHaveBeenCalled();
    expect(stock.issue).not.toHaveBeenCalled();
  });

  it('issues stock and purchases the quota when the code matches', async () => {
    const code = 'ABCD2345';
    const row = { ...ready, pickupCodeHash: hashPickupCode(code, pepper) };
    requests.findById.mockResolvedValue(row);
    requests.markCompleted.mockResolvedValue(row);
    shipments.receivedByForRequest.mockResolvedValue(undefined);
    await expect(service.complete(localAdmin, row.id, { code }, 'key-1')).resolves.toMatchObject({
      requestId: row.id,
      status: RequestStatus.COMPLETED,
    });
    expect(stock.issue).toHaveBeenCalledWith(expect.objectContaining({ qtyKg: 10, requestId: row.id }), handle);
    expect(allocations.purchase).toHaveBeenCalledWith(
      expect.objectContaining({ qtyKg: 10, farmerId: row.farmerId, inputId: row.items[0]?.inputId }),
      handle,
    );
  });
});
