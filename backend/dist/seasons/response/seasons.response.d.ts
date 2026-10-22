import type { Types } from 'mongoose';
import type { PriorityPolicy, SeasonStatus } from '../schema/season.schema.js';
export interface SeasonResponse {
    id: string;
    code: string;
    name: string;
    startsAt: Date;
    endsAt: Date;
    requestsOpenAt: Date;
    requestsCloseAt: Date;
    requisitionCutoffAt: Date;
    paymentWindowDays: number;
    pickupWindowDays: number;
    priorityPolicy: PriorityPolicy;
    status: SeasonStatus;
}
export interface SeasonListResponse {
    items: SeasonResponse[];
    nextCursor?: string;
}
export declare function toSeasonResponse(season: {
    id?: string;
    _id?: Types.ObjectId;
    code: string;
    name: string;
    startsAt: Date;
    endsAt: Date;
    requestsOpenAt: Date;
    requestsCloseAt: Date;
    requisitionCutoffAt: Date;
    paymentWindowDays: number;
    pickupWindowDays: number;
    priorityPolicy: PriorityPolicy;
    status: SeasonStatus;
}): SeasonResponse;
