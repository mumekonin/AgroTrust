import { type PriorityPolicy, type SeasonStatus } from '../schema/season.schema.js';
export declare class CreateSeasonDto {
    code: string;
    name: string;
    startsAt: string;
    endsAt: string;
    requestsOpenAt: string;
    requestsCloseAt: string;
    requisitionCutoffAt: string;
    paymentWindowDays: number;
    pickupWindowDays: number;
    priorityPolicy?: PriorityPolicy;
    status?: SeasonStatus;
}
export declare class ReplaceSeasonDto {
    code: string;
    name: string;
    startsAt: string;
    endsAt: string;
    requestsOpenAt: string;
    requestsCloseAt: string;
    requisitionCutoffAt: string;
    paymentWindowDays: number;
    pickupWindowDays: number;
    priorityPolicy: PriorityPolicy;
    status: SeasonStatus;
}
export declare class ListSeasonQuery {
    cursor?: string;
    limit?: number;
}
