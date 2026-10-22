import type { Types } from 'mongoose';
import type { FarmerStatus } from '../schema/farmer.schema.js';

export interface FarmerResponse {
  id: string;
  registryId: string;
  userId?: string;
  fullName: string;
  geo: { regionId: string; zoneId: string; woredaId: string; kebeleId: string };
  localCenterId: string;
  landHoldingHa: number;
  crops: string[];
  contact: {
    phone: string;
    phoneVerified: boolean;
    smsEnabled: boolean;
    sharedPhone: boolean;
  };
  status: FarmerStatus;
  verifiedAt?: Date;
}

export interface FarmerListResponse {
  items: FarmerResponse[];
  nextCursor?: string;
}

export interface ImportReport {
  dryRun: boolean;
  accepted: number;
  errors: { index: number; message: string }[];
}

export function toFarmerResponse(farmer: {
  id?: string;
  _id?: Types.ObjectId;
  registryId: string;
  userId?: Types.ObjectId | null;
  fullName: string;
  geo: {
    regionId: Types.ObjectId | string;
    zoneId: Types.ObjectId | string;
    woredaId: Types.ObjectId | string;
    kebeleId: Types.ObjectId | string;
  };
  localCenterId: Types.ObjectId | string;
  landHoldingHa: number;
  crops?: string[];
  contact: {
    phone: string;
    phoneVerified: boolean;
    smsEnabled: boolean;
    sharedPhone: boolean;
  };
  status: FarmerStatus;
  verifiedAt?: Date | null;
}): FarmerResponse {
  return {
    id: farmer.id ?? String(farmer._id),
    registryId: farmer.registryId,
    userId: farmer.userId ? String(farmer.userId) : undefined,
    fullName: farmer.fullName,
    geo: {
      regionId: String(farmer.geo.regionId),
      zoneId: String(farmer.geo.zoneId),
      woredaId: String(farmer.geo.woredaId),
      kebeleId: String(farmer.geo.kebeleId),
    },
    localCenterId: String(farmer.localCenterId),
    landHoldingHa: farmer.landHoldingHa,
    crops: farmer.crops ?? [],
    contact: {
      phone: farmer.contact.phone,
      phoneVerified: farmer.contact.phoneVerified,
      smsEnabled: farmer.contact.smsEnabled,
      sharedPhone: farmer.contact.sharedPhone,
    },
    status: farmer.status,
    verifiedAt: farmer.verifiedAt ?? undefined,
  };
}
