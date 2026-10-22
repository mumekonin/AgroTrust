import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { ProcessingState, RequisitionStatus } from '../schema/requisition.schema.js';
import { RequisitionsService } from './requisitions.service.js';

describe('RequisitionsService', () => {
  const centerId = new Types.ObjectId().toString();
  const seasonId = new Types.ObjectId().toString();
  const inputId = new Types.ObjectId().toString();
  const distributorId = new Types.ObjectId().toString();
  const requests = { bundle: vi.fn() };
  const distributors = { assignedDistributor: vi.fn() };
  const catalog = { activeIdsForCategory: vi.fn() };
  const centers = { getById: vi.fn() };
  const requisitions = { findById: vi.fn() };
  const service = new RequisitionsService(
    requisitions as never,
    {} as never,
    {} as never,
    requests as never,
    distributors as never,
    catalog as never,
    {} as never,
    centers as never,
    {} as never,
    {} as never,
    {} as never,
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
  const distributor: Principal = {
    ...localAdmin,
    userId: new Types.ObjectId().toString(),
    role: Role.DISTRIBUTOR_STAFF,
    roles: [Role.DISTRIBUTOR_STAFF],
    scope: { regionIds: [], woredaIds: [], localCenterIds: [], distributorId },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    centers.getById.mockResolvedValue({ id: centerId });
    distributors.assignedDistributor.mockResolvedValue({ distributorId });
    catalog.activeIdsForCategory.mockResolvedValue([inputId]);
    requests.bundle.mockResolvedValue({
      requestCount: 2,
      lines: [{ inputId, requestedKg: 40 }],
    });
  });

  it('previews a bundle without creating a requisition', async () => {
    const preview = await service.create(
      localAdmin,
      { seasonId, localCenterId: centerId, inputCategory: 'fertilizer', preview: true },
      'preview',
    );
    expect(preview).toMatchObject({ distributorId, requestCount: 2 });
    expect(requisitions.findById).not.toHaveBeenCalled();
  });

  it('rejects an accepted quantity above the bundled request', async () => {
    requisitions.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        distributorId: new Types.ObjectId(distributorId),
        status: RequisitionStatus.SUBMITTED,
        processing: { status: ProcessingState.DONE },
        lines: [{ inputId: new Types.ObjectId(inputId), requestedKg: 40, acceptedKg: 0, paidKg: 0, shippedKg: 0, receivedKg: 0 }],
        requestCount: 2,
      }),
    });
    await expect(
      service.respond(distributor, new Types.ObjectId().toString(), {
        lines: [{ inputId, acceptedKg: 80 }],
      }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
  });
});
