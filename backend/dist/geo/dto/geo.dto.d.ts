import { type GeoType } from '../schema/geo-unit.schema.js';
export declare class GeoNameDto {
    en: string;
    am: string;
    om: string;
}
export declare class CreateGeoDto {
    type: GeoType;
    code: string;
    name: GeoNameDto;
    parentId?: string;
}
export declare class UpdateGeoDto {
    code?: string;
    name?: GeoNameDto;
}
export declare class ListGeoQuery {
    parentId?: string;
    cursor?: string;
    limit?: number;
}
