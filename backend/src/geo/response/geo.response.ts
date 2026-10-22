import type { Types } from 'mongoose';
import type { GeoType } from '../schema/geo-unit.schema.js';

export interface GeoResponse {
  id: string;
  type: GeoType;
  code: string;
  name: { en: string; am: string; om: string };
  parentId?: string;
  path: string[];
}

export interface GeoListResponse {
  items: GeoResponse[];
  nextCursor?: string;
}

export function toGeoResponse(unit: {
  id?: string;
  _id?: Types.ObjectId;
  type: GeoType;
  code: string;
  name: { en: string; am: string; om: string };
  parentId?: Types.ObjectId | null;
  path?: Types.ObjectId[];
}): GeoResponse {
  return {
    id: unit.id ?? String(unit._id),
    type: unit.type,
    code: unit.code,
    name: { en: unit.name.en, am: unit.name.am, om: unit.name.om },
    parentId: unit.parentId ? String(unit.parentId) : undefined,
    path: (unit.path ?? []).map(String),
  };
}
