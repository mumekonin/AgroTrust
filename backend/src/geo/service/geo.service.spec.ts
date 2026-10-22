import { Types } from 'mongoose';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { expectedParentType, GeoType } from '../schema/geo-unit.schema.js';
import { GeoService } from './geo.service.js';

const regionId = new Types.ObjectId();
const name = { en: 'Oromia', am: 'ኦሮሚያ', om: 'Oromiyaa' };

describe('expectedParentType', () => {
  it('walks region, zone, woreda, kebele', () => {
    expect(expectedParentType(GeoType.REGION)).toBeNull();
    expect(expectedParentType(GeoType.ZONE)).toBe(GeoType.REGION);
    expect(expectedParentType(GeoType.WOREDA)).toBe(GeoType.ZONE);
    expect(expectedParentType(GeoType.KEBELE)).toBe(GeoType.WOREDA);
  });
});

describe('GeoService', () => {
  const model = {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  };
  const service = new GeoService(model as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a region with an empty path', async () => {
    model.create.mockResolvedValue({
      id: String(regionId),
      type: GeoType.REGION,
      code: 'OR',
      name,
      path: [],
    });

    const result = await service.create({ type: GeoType.REGION, code: ' OR ', name });

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: GeoType.REGION, code: 'OR', path: [] }),
    );
    expect(result.path).toEqual([]);
    expect(result.parentId).toBeUndefined();
  });

  it('rejects a region that names a parent', async () => {
    await expect(
      service.create({ type: GeoType.REGION, code: 'OR', name, parentId: String(regionId) }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    expect(model.create).not.toHaveBeenCalled();
  });

  it('stores the parent path when a zone is created under a region', async () => {
    model.findById.mockReturnValue({
      lean: () => ({
        exec: vi.fn().mockResolvedValue({
          _id: regionId,
          type: GeoType.REGION,
          path: [],
        }),
      }),
    });
    model.create.mockImplementation(async (doc: { path: Types.ObjectId[] }) => ({
      id: 'zone-1',
      type: GeoType.ZONE,
      code: 'OR-E',
      name,
      parentId: regionId,
      path: doc.path,
    }));

    const result = await service.create({
      type: GeoType.ZONE,
      code: 'OR-E',
      name,
      parentId: String(regionId),
    });

    expect(result.path).toEqual([String(regionId)]);
    expect(result.parentId).toBe(String(regionId));
  });

  it('rejects a kebele placed directly under a region', async () => {
    model.findById.mockReturnValue({
      lean: () => ({
        exec: vi.fn().mockResolvedValue({
          _id: regionId,
          type: GeoType.REGION,
          path: [],
        }),
      }),
    });

    await expect(
      service.create({
        type: GeoType.KEBELE,
        code: 'K1',
        name,
        parentId: String(regionId),
      }),
    ).rejects.toBeInstanceOf(AppException);
    expect(model.create).not.toHaveBeenCalled();
  });

  it('lists regions when no parent is given and returns a cursor', async () => {
    const first = new Types.ObjectId();
    const second = new Types.ObjectId();
    const docs = [first, second].map((id) => ({
      _id: id,
      type: GeoType.REGION,
      code: String(id),
      name,
      path: [],
    }));
    const exec = vi.fn().mockResolvedValue(docs);
    model.find.mockReturnValue({
      sort: () => ({ limit: () => ({ lean: () => ({ exec }) }) }),
    });

    const result = await service.list({ limit: 1 });

    expect(model.find).toHaveBeenCalledWith({ parentId: null });
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe(String(first));
  });
});
