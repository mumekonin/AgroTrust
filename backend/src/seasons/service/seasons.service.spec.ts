import { Types } from 'mongoose';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { PriorityPolicy, SeasonStatus, seasonWindowError } from '../schema/season.schema.js';
import { SeasonsService } from './seasons.service.js';

const window = {
  startsAt: '2026-06-01T00:00:00.000Z',
  endsAt: '2026-12-31T00:00:00.000Z',
  requestsOpenAt: '2026-06-01T00:00:00.000Z',
  requestsCloseAt: '2026-08-31T00:00:00.000Z',
  requisitionCutoffAt: '2026-09-15T00:00:00.000Z',
};

describe('seasonWindowError', () => {
  it('accepts a request window and cutoff inside the season', () => {
    expect(
      seasonWindowError({
        startsAt: new Date(window.startsAt),
        endsAt: new Date(window.endsAt),
        requestsOpenAt: new Date(window.requestsOpenAt),
        requestsCloseAt: new Date(window.requestsCloseAt),
        requisitionCutoffAt: new Date(window.requisitionCutoffAt),
      }),
    ).toBeNull();
  });

  it('rejects a season that ends before it starts', () => {
    expect(
      seasonWindowError({
        startsAt: new Date(window.endsAt),
        endsAt: new Date(window.startsAt),
        requestsOpenAt: new Date(window.requestsOpenAt),
        requestsCloseAt: new Date(window.requestsCloseAt),
        requisitionCutoffAt: new Date(window.requisitionCutoffAt),
      }),
    ).toBe('The season must end after it starts');
  });

  it('rejects a cutoff that falls before requests close', () => {
    expect(
      seasonWindowError({
        startsAt: new Date(window.startsAt),
        endsAt: new Date(window.endsAt),
        requestsOpenAt: new Date(window.requestsOpenAt),
        requestsCloseAt: new Date(window.requestsCloseAt),
        requisitionCutoffAt: new Date('2026-07-01T00:00:00.000Z'),
      }),
    ).toMatch(/requisition cutoff/);
  });
});

describe('SeasonsService', () => {
  const model = {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  };
  const service = new SeasonsService(model as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a draft season with first-come-first-served when those are omitted', async () => {
    model.create.mockImplementation(async (doc: { status: string; priorityPolicy: string }) => ({
      id: 'season-1',
      ...doc,
    }));

    const result = await service.create({
      code: ' 2026-MEHER ',
      name: ' Meher ',
      ...window,
      paymentWindowDays: 7,
      pickupWindowDays: 14,
    });

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: '2026-MEHER',
        name: 'Meher',
        status: SeasonStatus.DRAFT,
        priorityPolicy: PriorityPolicy.FCFS,
        paymentWindowDays: 7,
        pickupWindowDays: 14,
      }),
    );
    expect(result.status).toBe(SeasonStatus.DRAFT);
  });

  it('does not create a season whose request window is outside the season', async () => {
    await expect(
      service.create({
        code: '2026-MEHER',
        name: 'Meher',
        ...window,
        requestsOpenAt: '2026-05-01T00:00:00.000Z',
        paymentWindowDays: 7,
        pickupWindowDays: 14,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    expect(model.create).not.toHaveBeenCalled();
  });

  it('returns the next cursor when the page is full', async () => {
    const first = new Types.ObjectId();
    const second = new Types.ObjectId();
    const docs = [first, second].map((id) => ({
      _id: id,
      code: String(id),
      name: 'Meher',
      startsAt: new Date(window.startsAt),
      endsAt: new Date(window.endsAt),
      requestsOpenAt: new Date(window.requestsOpenAt),
      requestsCloseAt: new Date(window.requestsCloseAt),
      requisitionCutoffAt: new Date(window.requisitionCutoffAt),
      paymentWindowDays: 7,
      pickupWindowDays: 14,
      priorityPolicy: PriorityPolicy.FCFS,
      status: SeasonStatus.OPEN,
    }));
    model.find.mockReturnValue({
      sort: () => ({
        limit: () => ({ lean: () => ({ exec: vi.fn().mockResolvedValue(docs) }) }),
      }),
    });

    const result = await service.list({ limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe(String(first));
  });
});
