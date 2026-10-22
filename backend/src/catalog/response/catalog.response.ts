import type { Types } from 'mongoose';
import type { InputCategory } from '../schema/input.schema.js';

export interface InputResponse {
  id: string;
  code: string;
  name: { en: string; am: string; om: string };
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

export function toInputResponse(input: {
  id?: string;
  _id?: Types.ObjectId;
  code: string;
  name: { en: string; am: string; om: string };
  category: InputCategory;
  baseUnit: 'kg';
  packSizeKg: number;
  active: boolean;
}): InputResponse {
  return {
    id: input.id ?? String(input._id),
    code: input.code,
    name: { en: input.name.en, am: input.name.am, om: input.name.om },
    category: input.category,
    baseUnit: 'kg',
    packSizeKg: input.packSizeKg,
    active: input.active,
  };
}

export function toPriceResponse(price: {
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
}): PriceResponse {
  return {
    id: price.id ?? String(price._id),
    inputId: String(price.inputId),
    seasonId: String(price.seasonId),
    regionId: price.regionId ? String(price.regionId) : undefined,
    unitPriceSantimPerKg: price.unitPriceSantimPerKg,
    subsidySantimPerKg: price.subsidySantimPerKg,
    effectiveFrom: price.effectiveFrom,
    effectiveTo: price.effectiveTo ?? undefined,
    setBy: String(price.setBy),
    approvedBy: price.approvedBy ? String(price.approvedBy) : undefined,
    reason: price.reason,
  };
}
