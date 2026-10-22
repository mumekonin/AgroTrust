import type { Model } from 'mongoose';
import type { CreateGeoDto, UpdateGeoDto } from '../dto/geo.dto.js';
import { type GeoListResponse, type GeoResponse } from '../response/geo.response.js';
import { GeoUnit } from '../schema/geo-unit.schema.js';
export declare class GeoService {
    private readonly model;
    constructor(model: Model<GeoUnit>);
    list(query: {
        parentId?: string;
        cursor?: string;
        limit?: number;
    }): Promise<GeoListResponse>;
    getById(id: string): Promise<GeoResponse>;
    create(input: CreateGeoDto): Promise<GeoResponse>;
    update(id: string, input: UpdateGeoDto): Promise<GeoResponse>;
    private requireParent;
}
