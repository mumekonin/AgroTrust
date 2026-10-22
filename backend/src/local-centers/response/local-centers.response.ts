import type { Types } from 'mongoose';
import type { CenterStatus } from '../schema/local-center.schema.js';

export interface LocalCenterResponse {
  id: string;
  code: string;
  name: string;
  geo: { regionId: string; zoneId: string; woredaId: string; kebeleId: string };
  location: { type: 'Point'; coordinates: number[] };
  address: string;
  openingHours: string;
  localAdminUserIds: string[];
  servesKebeleIds: string[];
  capacityKg?: number;
  status: CenterStatus;
}

export interface LocalCenterListResponse {
  items: LocalCenterResponse[];
  nextCursor?: string;
}

export function toLocalCenterResponse(center: {
  id?: string;
  _id?: Types.ObjectId;
  code: string;
  name: string;
  geo: {
    regionId: Types.ObjectId | string;
    zoneId: Types.ObjectId | string;
    woredaId: Types.ObjectId | string;
    kebeleId: Types.ObjectId | string;
  };
  location: { type: 'Point'; coordinates: number[] };
  address: string;
  openingHours: string;
  localAdminUserIds?: Array<Types.ObjectId | string>;
  servesKebeleIds?: Array<Types.ObjectId | string>;
  capacityKg?: number;
  status: CenterStatus;
}): LocalCenterResponse {
  return {
    id: center.id ?? String(center._id),
    code: center.code,
    name: center.name,
    geo: {
      regionId: String(center.geo.regionId),
      zoneId: String(center.geo.zoneId),
      woredaId: String(center.geo.woredaId),
      kebeleId: String(center.geo.kebeleId),
    },
    location: { type: 'Point', coordinates: center.location.coordinates },
    address: center.address,
    openingHours: center.openingHours,
    localAdminUserIds: (center.localAdminUserIds ?? []).map(String),
    servesKebeleIds: (center.servesKebeleIds ?? []).map(String),
    capacityKg: center.capacityKg,
    status: center.status,
  };
}
