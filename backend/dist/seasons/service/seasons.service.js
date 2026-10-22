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
import { toSeasonResponse, } from '../response/seasons.response.js';
import { PriorityPolicy, Season, SeasonStatus, seasonWindowError, } from '../schema/season.schema.js';
const DEFAULT_LIMIT = 50;
let SeasonsService = class SeasonsService {
    model;
    constructor(model) {
        this.model = model;
    }
    async list(query) {
        const limit = query.limit ?? DEFAULT_LIMIT;
        const filter = {};
        if (query.cursor) {
            if (!Types.ObjectId.isValid(query.cursor)) {
                throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid cursor');
            }
            filter._id = { $gt: new Types.ObjectId(query.cursor) };
        }
        const docs = await this.model.find(filter).sort({ _id: 1 }).limit(limit + 1).lean().exec();
        const page = docs.slice(0, limit);
        const next = docs.length > limit ? page[page.length - 1] : undefined;
        return {
            items: page.map((doc) => toSeasonResponse(doc)),
            nextCursor: next ? String(next._id) : undefined,
        };
    }
    async getById(id) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
        }
        const doc = await this.model.findById(id).lean().exec();
        if (!doc)
            throw new AppException(ErrorCode.NOT_FOUND, 'Season not found', 404);
        return toSeasonResponse(doc);
    }
    async create(input) {
        const window = toWindow(input);
        const doc = await this.model.create({
            code: input.code.trim(),
            name: input.name.trim(),
            ...window,
            paymentWindowDays: input.paymentWindowDays,
            pickupWindowDays: input.pickupWindowDays,
            priorityPolicy: input.priorityPolicy ?? PriorityPolicy.FCFS,
            status: input.status ?? SeasonStatus.DRAFT,
        });
        return toSeasonResponse(doc);
    }
    async replace(id, input) {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
        }
        const window = toWindow(input);
        const doc = await this.model
            .findByIdAndUpdate(id, {
            $set: {
                code: input.code.trim(),
                name: input.name.trim(),
                ...window,
                paymentWindowDays: input.paymentWindowDays,
                pickupWindowDays: input.pickupWindowDays,
                priorityPolicy: input.priorityPolicy,
                status: input.status,
            },
        }, { new: true })
            .lean()
            .exec();
        if (!doc)
            throw new AppException(ErrorCode.NOT_FOUND, 'Season not found', 404);
        return toSeasonResponse(doc);
    }
};
SeasonsService = __decorate([
    Injectable(),
    __param(0, InjectModel(Season.name)),
    __metadata("design:paramtypes", [Function])
], SeasonsService);
export { SeasonsService };
function toWindow(input) {
    const window = {
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        requestsOpenAt: new Date(input.requestsOpenAt),
        requestsCloseAt: new Date(input.requestsCloseAt),
        requisitionCutoffAt: new Date(input.requisitionCutoffAt),
    };
    const error = seasonWindowError(window);
    if (error)
        throw new AppException(ErrorCode.VALIDATION_FAILED, error);
    return window;
}
//# sourceMappingURL=seasons.service.js.map