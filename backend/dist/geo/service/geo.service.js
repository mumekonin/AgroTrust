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
import { toGeoResponse } from '../response/geo.response.js';
import { expectedParentType, GeoUnit } from '../schema/geo-unit.schema.js';
const DEFAULT_LIMIT = 50;
let GeoService = class GeoService {
    model;
    constructor(model) {
        this.model = model;
    }
    async list(query) {
        const limit = query.limit ?? DEFAULT_LIMIT;
        const filter = {
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
    async getById(id) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
        }
        const doc = await this.model.findById(id).lean().exec();
        if (!doc)
            throw new AppException(ErrorCode.NOT_FOUND, 'Geo unit not found', 404);
        return toGeoResponse(doc);
    }
    async create(input) {
        const parentKind = expectedParentType(input.type);
        let path = [];
        let parentId;
        if (!parentKind) {
            if (input.parentId) {
                throw new AppException(ErrorCode.VALIDATION_FAILED, 'A region has no parent');
            }
        }
        else {
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
    async update(id, input) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
        }
        if (!input.code && !input.name) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Nothing to update');
        }
        const set = {};
        if (input.code)
            set.code = input.code.trim();
        if (input.name) {
            const name = trimName(input.name);
            set['name.en'] = name.en;
            set['name.am'] = name.am;
            set['name.om'] = name.om;
        }
        const doc = await this.model.findByIdAndUpdate(id, { $set: set }, { new: true }).lean().exec();
        if (!doc)
            throw new AppException(ErrorCode.NOT_FOUND, 'Geo unit not found', 404);
        return toGeoResponse(doc);
    }
    async requireParent(id, type) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid parent');
        }
        const parent = await this.model.findById(id).lean().exec();
        if (!parent)
            throw new AppException(ErrorCode.NOT_FOUND, 'Parent not found', 404);
        if (parent.type !== type) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, `Parent must be a ${type}`);
        }
        return { _id: parent._id, path: parent.path ?? [] };
    }
};
GeoService = __decorate([
    Injectable(),
    __param(0, InjectModel(GeoUnit.name)),
    __metadata("design:paramtypes", [Function])
], GeoService);
export { GeoService };
function trimName(name) {
    return { en: name.en.trim(), am: name.am.trim(), om: name.om.trim() };
}
//# sourceMappingURL=geo.service.js.map