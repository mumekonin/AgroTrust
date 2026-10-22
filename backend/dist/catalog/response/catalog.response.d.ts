import type { Types } from 'mongoose';
import type { InputCategory } from '../schema/input.schema.js';
export interface InputResponse {
    id: string;
    code: string;
    name: {
        en: string;
        am: string;
        om: string;
    };
    category: InputCategory;
    baseUnit: 'kg';
    packSizeKg: number;
    active: boolean;
}
export interface PriceResponse {
    id: string;
    inputId: string;
    seasonId: string;
    regionId?: string;
    unitPriceSantimPerKg: number;
    subsidySantimPerKg: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    setBy: string;
    approvedBy?: string;
    reason: string;
}
export interface CatalogPrice {
    id: string;
    unitPriceSantimPerKg: number;
    subsidySantimPerKg: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    regionId?: string;
}
export interface CatalogItem extends InputResponse {
    price: CatalogPrice | null;
}
export interface CatalogListResponse {
    items: CatalogItem[];
    nextCursor?: string;
}
export declare function toInputResponse(input: {
    id?: string;
    _id?: Types.ObjectId;
    code: string;
    name: {
        en: string;
        am: string;
        om: string;
    };
    category: InputCategory;
    baseUnit: 'kg';
    packSizeKg: number;
    active: boolean;
}): InputResponse;
export declare function toPriceResponse(price: {
    id?: string;
    _id?: Types.ObjectId;
    inputId: Types.ObjectId | string;
    seasonId: Types.ObjectId | string;
    regionId?: Types.ObjectId | string | null;
    unitPriceSantimPerKg: number;
    subsidySantimPerKg: number;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
    setBy: Types.ObjectId | string;
    approvedBy?: Types.ObjectId | string | null;
    reason: string;
}): PriceResponse;
