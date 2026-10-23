import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { RequisitionStatus } from '../../requisitions/schema/requisition.schema.js';
import { ShipmentsService } from './shipments.service.js';

describe('ShipmentsService', () => {
  const distributorId = new Types.ObjectId().toString();
  const requisitionId = new Types.ObjectId().toString();
  const requisitions = { readForDispatch: vi.fn() };
  const shipments = { findOne: vi.fn() };
  const service = new ShipmentsService(
    shipments as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    requisitions as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const distributor: Principal = {
    userId: new Types.ObjectId().toString(),
    sid: 'sid',
    role: Role.DISTRIBUTOR_STAFF,
    roles: [Role.DISTRIBUTOR_STAFF],
    scope: { regionIds: [], woredaIds: [], localCenterIds: [], distributorId },
    ip: '127.0.0.1',
    requestId: 'req',
  };

  beforeEach(() => vi.clearAllMocks());

  it('rejects a shipment before the requisition is accepted', async () => {
    requisitions.readForDispatch.mockResolvedValue({
      id: requisitionId,
      distributorId,
      localCenterId: new Types.ObjectId().toString(),
      seasonId: new Types.ObjectId().toString(),
      status: RequisitionStatus.SUBMITTED,
      ready: false,
      lines: [],
    });
    await expect(
      service.create(
        distributor,
        {
          requisitionId,
          etaAt: new Date(Date.now() + 86_400_000).toISOString(),
          transport: { vehiclePlate: 'AA-12345', driverName: 'Abebe', driverPhone: '0911000000' },
          lines: [{ inputId: new Types.ObjectId().toString(), batchId: new Types.ObjectId().toString(), qtyKg: 10 }],
        },
        'key-1',
      ),
    ).rejects.toMatchObject({ code: ErrorCode.CONFLICT });
    expect(shipments.findOne).not.toHaveBeenCalled();
  });
});
