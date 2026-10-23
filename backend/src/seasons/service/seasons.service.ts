import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { CreateSeasonDto, ReplaceSeasonDto } from '../dto/seasons.dto.js';
import {
  toSeasonResponse,
  type SeasonListResponse,
  type SeasonResponse,
} from '../response/seasons.response.js';
import {
  PriorityPolicy,
  Season,
  SeasonStatus,
  seasonWindowError,
  type SeasonWindow,
} from '../schema/season.schema.js';

const DEFAULT_LIMIT = 50;

@Injectable()
export class SeasonsService {
  constructor(@InjectModel(Season.name) private readonly model: Model<Season>) {}

  async list(query: { cursor?: string; limit?: number }): Promise<SeasonListResponse> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const filter: Record<string, unknown> = {};
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

  async getById(id: string): Promise<SeasonResponse> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
    }
    const doc = await this.model.findById(id).lean().exec();
    if (!doc) throw new AppException(ErrorCode.NOT_FOUND, 'Season not found', 404);
    return toSeasonResponse(doc);
  }

  async pastRequisitionCutoff(now: Date): Promise<string[]> {
    const docs = await this.model
      .find({ requisitionCutoffAt: { $lte: now } })
      .select({ _id: 1 })
      .lean()
      .exec();
    return docs.map((doc) => String(doc._id));
  }

  async endedIds(now: Date): Promise<string[]> {
    const docs = await this.model.find({ endsAt: { $lte: now } }).select({ _id: 1 }).lean().exec();
    return docs.map((doc) => String(doc._id));
  }

  async create(input: CreateSeasonDto): Promise<SeasonResponse> {
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

  async replace(id: string, input: ReplaceSeasonDto): Promise<SeasonResponse> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
    }
    const window = toWindow(input);
    const doc = await this.model
      .findByIdAndUpdate(
        id,
        {
          $set: {
            code: input.code.trim(),
            name: input.name.trim(),
            ...window,
            paymentWindowDays: input.paymentWindowDays,
            pickupWindowDays: input.pickupWindowDays,
            priorityPolicy: input.priorityPolicy,
            status: input.status,
          },
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new AppException(ErrorCode.NOT_FOUND, 'Season not found', 404);
    return toSeasonResponse(doc);
  }
}

function toWindow(input: {
  startsAt: string;
  endsAt: string;
  requestsOpenAt: string;
  requestsCloseAt: string;
  requisitionCutoffAt: string;
}): SeasonWindow {
  const window: SeasonWindow = {
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    requestsOpenAt: new Date(input.requestsOpenAt),
    requestsCloseAt: new Date(input.requestsCloseAt),
    requisitionCutoffAt: new Date(input.requisitionCutoffAt),
  };
  const error = seasonWindowError(window);
  if (error) throw new AppException(ErrorCode.VALIDATION_FAILED, error);
  return window;
}
