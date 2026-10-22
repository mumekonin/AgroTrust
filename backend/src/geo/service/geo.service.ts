import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { CreateGeoDto, UpdateGeoDto } from '../dto/geo.dto.js';
import { toGeoResponse, type GeoListResponse, type GeoResponse } from '../response/geo.response.js';
import { expectedParentType, GeoUnit, type GeoType } from '../schema/geo-unit.schema.js';

const DEFAULT_LIMIT = 50;

@Injectable()
export class GeoService {
  constructor(@InjectModel(GeoUnit.name) private readonly model: Model<GeoUnit>) {}

  async list(query: { parentId?: string; cursor?: string; limit?: number }): Promise<GeoListResponse> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const filter: Record<string, unknown> = {
      parentId: query.parentId ? new Types.ObjectId(query.parentId) : null,
    };
    if (query.cursor) {
      if (!Types.ObjectId.isValid(query.cursor)) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid cursor');
      }
      filter._id = { $gt: new Types.ObjectId(query.cursor) };
    }

    const docs = await this.model
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean()
      .exec();
    const page = docs.slice(0, limit);
    const next = docs.length > limit ? page[page.length - 1] : undefined;
    return {
      items: page.map((doc) => toGeoResponse(doc)),
      nextCursor: next ? String(next._id) : undefined,
    };
  }

  async getById(id: string): Promise<GeoResponse> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
    }
    const doc = await this.model.findById(id).lean().exec();
    if (!doc) throw new AppException(ErrorCode.NOT_FOUND, 'Geo unit not found', 404);
    return toGeoResponse(doc);
  }

  async create(input: CreateGeoDto): Promise<GeoResponse> {
    const parentKind = expectedParentType(input.type);
    let path: Types.ObjectId[] = [];
    let parentId: Types.ObjectId | undefined;

    if (!parentKind) {
      if (input.parentId) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'A region has no parent');
      }
    } else {
      if (!input.parentId) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'A parent is required');
      }
      const parent = await this.requireParent(input.parentId, parentKind);
      parentId = parent._id;
      path = [...parent.path, parent._id];
    }

    const doc = await this.model.create({
      type: input.type,
      code: input.code.trim(),
      name: trimName(input.name),
      parentId,
      path,
    });
    return toGeoResponse(doc);
  }

  async update(id: string, input: UpdateGeoDto): Promise<GeoResponse> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
    }
    if (!input.code && !input.name) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Nothing to update');
    }
    const set: Record<string, string> = {};
    if (input.code) set.code = input.code.trim();
    if (input.name) {
      const name = trimName(input.name);
      set['name.en'] = name.en;
      set['name.am'] = name.am;
      set['name.om'] = name.om;
    }
    const doc = await this.model.findByIdAndUpdate(id, { $set: set }, { new: true }).lean().exec();
    if (!doc) throw new AppException(ErrorCode.NOT_FOUND, 'Geo unit not found', 404);
    return toGeoResponse(doc);
  }

  private async requireParent(id: string, type: GeoType): Promise<{ _id: Types.ObjectId; path: Types.ObjectId[] }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid parent');
    }
    const parent = await this.model.findById(id).lean().exec();
    if (!parent) throw new AppException(ErrorCode.NOT_FOUND, 'Parent not found', 404);
    if (parent.type !== type) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, `Parent must be a ${type}`);
    }
    return { _id: parent._id, path: parent.path ?? [] };
  }
}

function trimName(name: { en: string; am: string; om: string }) {
  return { en: name.en.trim(), am: name.am.trim(), om: name.om.trim() };
}
