var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { GeoService } from '../../geo/service/geo.service.js';
import { SeasonsService } from '../../seasons/service/seasons.service.js';
import { toInputResponse, toPriceResponse, } from '../response/catalog.response.js';
import { BASE_UNIT, Input } from '../schema/input.schema.js';
import { Price } from '../schema/price.schema.js';
const DEFAULT_LIMIT = 50;
export function pickCurrentPrice(candidates, now, regionId) {
    const nowMs = now.getTime();
    const effective = candidates.filter((price) => {
        if (!price.approved)
            return false;
        if (price.effectiveFrom.getTime() > nowMs)
            return false;
        if (price.effectiveTo && price.effectiveTo.getTime() <= nowMs)
            return false;
        return true;
    });
    const regional = regionId ? effective.filter((price) => price.regionId === regionId) : [];
    const pool = regional.length > 0 ? regional : effective.filter((price) => !price.regionId);
    pool.sort((left, right) => right.effectiveFrom.getTime() - left.effectiveFrom.getTime());
    return pool[0] ?? null;
}
let CatalogService = class CatalogService {
    inputs;
    prices;
    geo;
    seasons;
    constructor(inputs, prices, geo, seasons) {
        this.inputs = inputs;
        this.prices = prices;
        this.geo = geo;
        this.seasons = seasons;
    }
    async list(query) {
        await this.seasons.getById(query.seasonId);
        if (query.regionId)
            await this.requireRegion(query.regionId);
        const limit = query.limit ?? DEFAULT_LIMIT;
        const filter = { active: true };
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
    async createInput(input) {
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
    async updateInput(id, input) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
        }
        if (!input.name && input.packSizeKg === undefined && input.active === undefined) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Nothing to update');
        }
        const set = {};
        if (input.name) {
            const name = trimName(input.name);
            set['name.en'] = name.en;
            set['name.am'] = name.am;
            set['name.om'] = name.om;
        }
        if (input.packSizeKg !== undefined)
            set.packSizeKg = input.packSizeKg;
        if (input.active !== undefined)
            set.active = input.active;
        const doc = await this.inputs.findByIdAndUpdate(id, { $set: set }, { new: true }).lean().exec();
        if (!doc)
            throw new AppException(ErrorCode.NOT_FOUND, 'Input not found', 404);
        return toInputResponse(doc);
    }
    async recordPrice(actorId, input) {
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
        if (input.regionId)
            await this.requireRegion(input.regionId);
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
    async approvePrice(actorId, id) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
        }
        const doc = await this.prices.findById(id).exec();
        if (!doc)
            throw new AppException(ErrorCode.NOT_FOUND, 'Price not found', 404);
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
    async attachPrices(inputs, seasonId, regionId, now) {
        if (inputs.length === 0)
            return [];
        const ids = inputs.map((input) => input._id);
        const prices = await this.prices
            .find({
            inputId: { $in: ids },
            seasonId: new Types.ObjectId(seasonId),
            approvedBy: { $ne: null },
        })
            .lean()
            .exec();
        const grouped = new Map();
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
    async requireInput(id) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid input');
        }
        const input = await this.inputs.findById(id).select({ _id: 1 }).lean().exec();
        if (!input)
            throw new AppException(ErrorCode.NOT_FOUND, 'Input not found', 404);
    }
    async requireRegion(id) {
        const region = await this.geo.getById(id);
        if (region.type !== 'region') {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'regionId must be a region');
        }
    }
};
CatalogService = __decorate([
    Injectable(),
    __param(0, InjectModel(Input.name)),
    __param(1, InjectModel(Price.name)),
    __metadata("design:paramtypes", [Function, Function, GeoService,
        SeasonsService])
], CatalogService);
export { CatalogService };
function trimName(name) {
    return { en: name.en.trim(), am: name.am.trim(), om: name.om.trim() };
}
//# sourceMappingURL=catalog.service.js.map