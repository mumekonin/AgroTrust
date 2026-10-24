import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { GeoService } from '../../geo/service/geo.service.js';
import { SeasonsService } from '../../seasons/service/seasons.service.js';
import type { CreateInputDto, CreatePriceDto, UpdateInputDto } from '../dto/catalog.dto.js';
import {
  toInputResponse,
  toPriceResponse,
  type CatalogItem,
  type CatalogListResponse,
  type InputResponse,
  type PriceResponse,
} from '../response/catalog.response.js';
import { BASE_UNIT, Input, type InputCategory } from '../schema/input.schema.js';
import { Price } from '../schema/price.schema.js';

const DEFAULT_LIMIT = 50;

export interface PriceCandidate {
  id: string;
  regionId?: string;
  unitPriceSantimPerKg: number;
  subsidySantimPerKg: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  approved: boolean;
}

/** Latest approved price that is in force. A regional price wins over the national one. */
export function pickCurrentPrice(
  candidates: PriceCandidate[],
  now: Date,
  regionId?: string,
): PriceCandidate | null {
  const nowMs = now.getTime();
  const effective = candidates.filter((price) => {
    if (!price.approved) return false;
    if (price.effectiveFrom.getTime() > nowMs) return false;
    if (price.effectiveTo && price.effectiveTo.getTime() <= nowMs) return false;
    return true;
  });
  const regional = regionId ? effective.filter((price) => price.regionId === regionId) : [];
  const pool = regional.length > 0 ? regional : effective.filter((price) => !price.regionId);
  pool.sort((left, right) => right.effectiveFrom.getTime() - left.effectiveFrom.getTime());
  return pool[0] ?? null;
}

@Injectable()
export class CatalogService {
  constructor(
    @InjectModel(Input.name) private readonly inputs: Model<Input>,
    @InjectModel(Price.name) private readonly prices: Model<Price>,
    private readonly geo: GeoService,
    private readonly seasons: SeasonsService,
  ) {}

  async list(query: {
    seasonId: string;
    regionId?: string;
    cursor?: string;
    limit?: number;
    now?: Date;
  }): Promise<CatalogListResponse> {
    await this.seasons.getById(query.seasonId);
    if (query.regionId) await this.requireRegion(query.regionId);

    const limit = query.limit ?? DEFAULT_LIMIT;
    const filter: Record<string, unknown> = { active: true };
    if (query.cursor) {
      if (!Types.ObjectId.isValid(query.cursor)) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid cursor');
      }
      filter._id = { $gt: new Types.ObjectId(query.cursor) };
    }
    const docs = await this.inputs.find(filter).sort({ _id: 1 }).limit(limit + 1).lean().exec();
    const page = docs.slice(0, limit);
    const priced = await this.attachPrices(page, query.seasonId, query.regionId, query.now ?? new Date());
    const next = docs.length > limit ? page[page.length - 1] : undefined;
    return { items: priced, nextCursor: next ? String(next._id) : undefined };
  }

  async createInput(input: CreateInputDto): Promise<InputResponse> {
    const doc = await this.inputs.create({
      code: input.code.trim(),
      name: trimName(input.name),
      category: input.category,
      baseUnit: BASE_UNIT,
      packSizeKg: input.packSizeKg,
      active: input.active ?? true,
    });
    return toInputResponse(doc);
  }

  async updateInput(id: string, input: UpdateInputDto): Promise<InputResponse> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
    }
    if (!input.name && input.packSizeKg === undefined && input.active === undefined) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Nothing to update');
    }
    const set: Record<string, unknown> = {};
    if (input.name) {
      const name = trimName(input.name);
      set['name.en'] = name.en;
      set['name.am'] = name.am;
      set['name.om'] = name.om;
    }
    if (input.packSizeKg !== undefined) set.packSizeKg = input.packSizeKg;
    if (input.active !== undefined) set.active = input.active;
    const doc = await this.inputs.findByIdAndUpdate(id, { $set: set }, { new: true }).lean().exec();
    if (!doc) throw new AppException(ErrorCode.NOT_FOUND, 'Input not found', 404);
    return toInputResponse(doc);
  }

  async listPrices(seasonId: string): Promise<{
    items: Array<{
      id: string;
      inputId: string;
      code: string;
      unitPriceSantimPerKg: number;
      subsidySantimPerKg: number;
      approved: boolean;
    }>;
  }> {
    if (!Types.ObjectId.isValid(seasonId)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid season');
    }
    const docs = await this.prices
      .find({ seasonId: new Types.ObjectId(seasonId) })
      .sort({ effectiveFrom: -1 })
      .limit(100)
      .lean()
      .exec();
    const inputs = await this.inputs
      .find({ _id: { $in: docs.map((doc) => doc.inputId) } })
      .select({ code: 1 })
      .lean()
      .exec();
    const codes = new Map(inputs.map((input) => [String(input._id), input.code]));
    return {
      items: docs.map((doc) => ({
        id: String(doc._id),
        inputId: String(doc.inputId),
        code: codes.get(String(doc.inputId)) ?? '',
        unitPriceSantimPerKg: doc.unitPriceSantimPerKg,
        subsidySantimPerKg: doc.subsidySantimPerKg,
        approved: Boolean(doc.approvedBy),
      })),
    };
  }

  async recordPrice(actorId: string, input: CreatePriceDto): Promise<PriceResponse> {
    if (input.subsidySantimPerKg > input.unitPriceSantimPerKg) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'The subsidy cannot exceed the price');
    }
    const effectiveFrom = new Date(input.effectiveFrom);
    const effectiveTo = input.effectiveTo ? new Date(input.effectiveTo) : undefined;
    if (effectiveTo && effectiveTo.getTime() <= effectiveFrom.getTime()) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'effectiveTo must be after effectiveFrom');
    }
    await this.requireInput(input.inputId);
    await this.seasons.getById(input.seasonId);
    if (input.regionId) await this.requireRegion(input.regionId);

    const doc = await this.prices.create({
      inputId: new Types.ObjectId(input.inputId),
      seasonId: new Types.ObjectId(input.seasonId),
      regionId: input.regionId ? new Types.ObjectId(input.regionId) : undefined,
      unitPriceSantimPerKg: input.unitPriceSantimPerKg,
      subsidySantimPerKg: input.subsidySantimPerKg,
      effectiveFrom,
      effectiveTo,
      setBy: new Types.ObjectId(actorId),
      reason: input.reason.trim(),
    });
    return toPriceResponse(doc);
  }

  async approvePrice(actorId: string, id: string): Promise<PriceResponse> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
    }
    const doc = await this.prices.findById(id).exec();
    if (!doc) throw new AppException(ErrorCode.NOT_FOUND, 'Price not found', 404);
    if (doc.approvedBy) {
      throw new AppException(ErrorCode.CONFLICT, 'This price is already approved', 409);
    }
    if (String(doc.setBy) === actorId) {
      throw new AppException(ErrorCode.FORBIDDEN, 'A second national admin must approve', 403);
    }
    doc.approvedBy = new Types.ObjectId(actorId);
    await doc.save();
    return toPriceResponse(doc);
  }

  async activeIdsForCategory(category: InputCategory): Promise<string[]> {
    const docs = await this.inputs.find({ category, active: true }).select({ _id: 1 }).lean().exec();
    return docs.map((doc) => String(doc._id));
  }

  async categoryOf(id: string): Promise<InputCategory> {
    if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid input');
    const input = await this.inputs.findById(id).select({ category: 1, active: 1 }).lean().exec();
    if (!input) throw new AppException(ErrorCode.NOT_FOUND, 'Input not found', 404);
    if (!input.active) throw new AppException(ErrorCode.VALIDATION_FAILED, 'This input is not active');
    return input.category;
  }

  async requireActiveInput(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid input');
    const input = await this.inputs.findById(id).select({ active: 1 }).lean().exec();
    if (!input) throw new AppException(ErrorCode.NOT_FOUND, 'Input not found', 404);
    if (!input.active) throw new AppException(ErrorCode.VALIDATION_FAILED, 'This input is not active');
  }

  /** Approved price in force. A regional price wins over the national one. */
  async officialPrice(
    inputId: string,
    seasonId: string,
    regionId: string,
    now = new Date(),
  ): Promise<{ unitPriceSantimPerKg: number; subsidySantimPerKg: number }> {
    await this.requireActiveInput(inputId);
    if (!Types.ObjectId.isValid(seasonId)) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid season');
    const rows = await this.prices
      .find({
        inputId: new Types.ObjectId(inputId),
        seasonId: new Types.ObjectId(seasonId),
        approvedBy: { $exists: true },
      })
      .lean()
      .exec();
    const current = pickCurrentPrice(
      rows.map((price) => ({
        id: String(price._id),
        regionId: price.regionId ? String(price.regionId) : undefined,
        unitPriceSantimPerKg: price.unitPriceSantimPerKg,
        subsidySantimPerKg: price.subsidySantimPerKg,
        effectiveFrom: price.effectiveFrom,
        effectiveTo: price.effectiveTo ?? undefined,
        approved: Boolean(price.approvedBy),
      })),
      now,
      regionId,
    );
    if (!current) throw new AppException(ErrorCode.NOT_FOUND, 'No official price is in force', 404);
    return {
      unitPriceSantimPerKg: current.unitPriceSantimPerKg,
      subsidySantimPerKg: current.subsidySantimPerKg,
    };
  }

  private async attachPrices(
    inputs: Array<{
      _id: Types.ObjectId;
      code: string;
      name: { en: string; am: string; om: string };
      category: CatalogItem['category'];
      baseUnit: 'kg';
      packSizeKg: number;
      active: boolean;
    }>,
    seasonId: string,
    regionId: string | undefined,
    now: Date,
  ): Promise<CatalogItem[]> {
    if (inputs.length === 0) return [];
    const ids = inputs.map((input) => input._id);
    const prices = await this.prices
      .find({
        inputId: { $in: ids },
        seasonId: new Types.ObjectId(seasonId),
        approvedBy: { $ne: null },
      })
      .lean()
      .exec();
    const grouped = new Map<string, PriceCandidate[]>();
    for (const price of prices) {
      const key = String(price.inputId);
      const list = grouped.get(key) ?? [];
      list.push({
        id: String(price._id),
        regionId: price.regionId ? String(price.regionId) : undefined,
        unitPriceSantimPerKg: price.unitPriceSantimPerKg,
        subsidySantimPerKg: price.subsidySantimPerKg,
        effectiveFrom: price.effectiveFrom,
        effectiveTo: price.effectiveTo ?? undefined,
        approved: Boolean(price.approvedBy),
      });
      grouped.set(key, list);
    }
    return inputs.map((input) => {
      const current = pickCurrentPrice(grouped.get(String(input._id)) ?? [], now, regionId);
      return {
        ...toInputResponse(input),
        price: current
          ? {
              id: current.id,
              unitPriceSantimPerKg: current.unitPriceSantimPerKg,
              subsidySantimPerKg: current.subsidySantimPerKg,
              effectiveFrom: current.effectiveFrom,
              effectiveTo: current.effectiveTo,
              regionId: current.regionId,
            }
          : null,
      };
    });
  }

  private async requireInput(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid input');
    }
    const input = await this.inputs.findById(id).select({ _id: 1 }).lean().exec();
    if (!input) throw new AppException(ErrorCode.NOT_FOUND, 'Input not found', 404);
  }

  private async requireRegion(id: string): Promise<void> {
    const region = await this.geo.getById(id);
    if (region.type !== 'region') {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'regionId must be a region');
    }
  }
}

function trimName(name: { en: string; am: string; om: string }) {
  return { en: name.en.trim(), am: name.am.trim(), om: name.om.trim() };
}
