import type { Types } from 'mongoose';

export interface AllocationRuleResponse {
  id: string;
  seasonId: string;
  inputId: string;
  regionId?: string;
  rateKgPerHa: number;
  minKg: number;
  maxHa: number;
  maxKgPerFarmer: number;
  cropFilter?: string;
  version: number;
  effectiveFrom: Date;
  createdBy: string;
  approvedBy?: string;
}

export interface AllocationResponse {
  id: string;
  farmerId: string;
  seasonId: string;
  inputId: string;
  entitledKg: number;
  reservedKg: number;
  purchasedKg: number;
  remainingKg: number;
  basis: { landHoldingHa: number; rateKgPerHa: number; ruleVersion: number };
}

export interface AllocationListResponse {
  items: AllocationResponse[];
  nextCursor?: string;
}

export interface GenerateAllocationsResponse {
  ruleId: string;
  created: number;
  unchanged: number;
}

export function toAllocationRuleResponse(rule: {
  id?: string;
  _id?: Types.ObjectId;
  seasonId: Types.ObjectId | string;
  inputId: Types.ObjectId | string;
  regionId?: Types.ObjectId | string | null;
  rateKgPerHa: number;
  minKg: number;
  maxHa: number;
  maxKgPerFarmer: number;
  cropFilter?: string;
  version: number;
  effectiveFrom: Date;
  createdBy: Types.ObjectId | string;
  approvedBy?: Types.ObjectId | string | null;
}): AllocationRuleResponse {
  return {
    id: rule.id ?? String(rule._id),
    seasonId: String(rule.seasonId),
    inputId: String(rule.inputId),
    regionId: rule.regionId ? String(rule.regionId) : undefined,
    rateKgPerHa: rule.rateKgPerHa,
    minKg: rule.minKg,
    maxHa: rule.maxHa,
    maxKgPerFarmer: rule.maxKgPerFarmer,
    cropFilter: rule.cropFilter,
    version: rule.version,
    effectiveFrom: rule.effectiveFrom,
    createdBy: String(rule.createdBy),
    approvedBy: rule.approvedBy ? String(rule.approvedBy) : undefined,
  };
}

export function toAllocationResponse(allocation: {
  id?: string;
  _id?: Types.ObjectId;
  farmerId: Types.ObjectId | string;
  seasonId: Types.ObjectId | string;
  inputId: Types.ObjectId | string;
  entitledKg: number;
  reservedKg: number;
  purchasedKg: number;
  basis: { landHoldingHa: number; rateKgPerHa: number; ruleVersion: number };
}): AllocationResponse {
  return {
    id: allocation.id ?? String(allocation._id),
    farmerId: String(allocation.farmerId),
    seasonId: String(allocation.seasonId),
    inputId: String(allocation.inputId),
    entitledKg: allocation.entitledKg,
    reservedKg: allocation.reservedKg,
    purchasedKg: allocation.purchasedKg,
    remainingKg: allocation.entitledKg - allocation.reservedKg - allocation.purchasedKg,
    basis: {
      landHoldingHa: allocation.basis.landHoldingHa,
      rateKgPerHa: allocation.basis.rateKgPerHa,
      ruleVersion: allocation.basis.ruleVersion,
    },
  };
}
