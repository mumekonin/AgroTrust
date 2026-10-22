import type { Types } from 'mongoose';
import type { GeoType } from '../schema/geo-unit.schema.js';
export interface GeoResponse {
    id: string;
    type: GeoType;
    code: string;
    name: {
        en: string;
        am: string;
        om: string;
    };
    parentId?: string;
    path: string[];
}
export interface GeoListResponse {
    items: GeoResponse[];
    nextCursor?: string;
}
export declare function toGeoResponse(unit: {
    id?: string;
    _id?: Types.ObjectId;
    type: GeoType;
    code: string;
    name: {
        en: string;
        am: string;
        om: string;
    };
    parentId?: Types.ObjectId | null;
    path?: Types.ObjectId[];
}): GeoResponse;
