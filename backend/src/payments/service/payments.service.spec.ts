import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { NotificationEvent } from '../../notifications/schema/notification.schema.js';
import { RequestStatus } from '../../requests/schema/input-request.schema.js';
import { PaymentProvider, PaymentStatus } from '../schema/payment.schema.js';
import { PaymentsService } from './payments.service.js';

describe('PaymentsService', () => {
  const centerId = new Types.ObjectId().toString();
  const requestId = new Types.ObjectId().toString();
  const farmerId = new Types.ObjectId().toString();
  const requisitionId = new Types.ObjectId().toString();
  const inputId = new Types.ObjectId().toString();
  const requests = { read: vi.fn(), markPaid: vi.fn() };
  const requisitions = { recordPaid: vi.fn() };
  const payments = { findOne: vi.fn(), create: vi.fn() };
  const farmers = { lookupMany: vi.fn() };
  const users = { findById: vi.fn() };
  const notifications = { enqueue: vi.fn() };
  const audit = { append: vi.fn() };
  const connection = { startSession: vi.fn() };
  const service = new PaymentsService(
    payments as never,
    connection as never,
    requests as never,
    requisitions as never,
    {} as never,
    farmers as never,
    users as never,
    notifications as never,
    audit as never,
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
  const accepted = {
    id: requestId,
    requestNo: 'RQ-26-000123',
    farmerId,
    seasonId: new Types.ObjectId().toString(),
    localCenterId: centerId,
    requisitionId,
    status: RequestStatus.ACCEPTED,
    paymentDueAt: new Date(Date.now() + 86_400_000),
    payableSantim: 100_000,
    items: [{ inputId, qtyKg: 20, acceptedQtyKg: 10, unitPriceSantimPerKg: 5000, subsidySantimPerKg: 1000 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    payments.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
    requests.read.mockResolvedValue(accepted);
    connection.startSession.mockResolvedValue({
      endSession: vi.fn(),
      withTransaction: async (fn: (session: unknown) => Promise<void>) => fn({}),
    });
  });

  it('rejects a local admin from another center', async () => {
    requests.read.mockResolvedValue({ ...accepted, localCenterId: new Types.ObjectId().toString() });
    await expect(service.confirm(localAdmin, requestId, { slipNo: 'SLIP-1' }, 'key-1')).rejects.toMatchObject({
      code: ErrorCode.FORBIDDEN,
    });
  });

  it('rejects a request that is not awaiting payment', async () => {
    requests.read.mockResolvedValue({ ...accepted, status: RequestStatus.REQUISITIONED });
    await expect(service.confirm(localAdmin, requestId, { slipNo: 'SLIP-1' }, 'key-1')).rejects.toMatchObject({
      code: ErrorCode.CONFLICT,
    });
    expect(connection.startSession).not.toHaveBeenCalled();
  });

  it('returns the original payment when the idempotency key is repeated', async () => {
    const existing = paymentDoc(requestId);
    payments.findOne.mockReturnValueOnce({ exec: vi.fn().mockResolvedValue(existing) });
    const result = await service.confirm(localAdmin, requestId, { slipNo: 'SLIP-9' }, 'key-1');
    expect(result.paymentNo).toBe('PY-26-000123');
    expect(connection.startSession).not.toHaveBeenCalled();
  });

  it('records the accepted amount and marks the request paid', async () => {
    requests.markPaid.mockResolvedValue(accepted);
    payments.create.mockResolvedValue([paymentDoc()]);
    farmers.lookupMany.mockResolvedValue(
      new Map([[farmerId, { userId: localAdmin.userId, phone: '+251911000000', smsEnabled: true }]]),
    );
    users.findById.mockResolvedValue({ preferredLanguage: 'en' });

    const result = await service.confirm(localAdmin, requestId, { slipNo: ' SLIP-1 ' }, 'key-1');

    expect(result).toMatchObject({ paymentNo: 'PY-26-000123', amountSantim: 40_000, slipNo: 'SLIP-1' });
    expect(requests.markPaid).toHaveBeenCalledWith(
      requestId,
      40_000,
      expect.any(Date),
      localAdmin.userId,
      expect.objectContaining({ withTransaction: expect.any(Function) }),
    );
    expect(requisitions.recordPaid).toHaveBeenCalledWith(
      requisitionId,
      [{ inputId, qtyKg: 10 }],
      expect.objectContaining({ withTransaction: expect.any(Function) }),
    );
    expect(notifications.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ event: NotificationEvent.PAYMENT_CONFIRMED, params: { amount: '400.00' } }),
    );
    expect(audit.append).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYMENT_CONFIRMED' }));
  });
});

function paymentDoc(forRequestId?: string) {
  return {
    _id: new Types.ObjectId(),
    paymentNo: 'PY-26-000123',
    requestId: forRequestId ? new Types.ObjectId(forRequestId) : new Types.ObjectId(),
    farmerId: new Types.ObjectId(),
    amountSantim: 40_000,
    provider: PaymentProvider.BANK,
    providerRef: 'SLIP-1',
    status: PaymentStatus.CONFIRMED,
    confirmedAt: new Date(),
  };
}
