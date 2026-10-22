import { CreateGeoDto, ListGeoQuery, UpdateGeoDto } from '../dto/geo.dto.js';
import { GeoService } from '../service/geo.service.js';
export declare class GeoController {
    private readonly geo;
    constructor(geo: GeoService);
    list(query: ListGeoQuery): Promise<import("../response/geo.response.js").GeoListResponse>;
    get(id: string): Promise<import("../response/geo.response.js").GeoResponse>;
}
export declare class AdminGeoController {
    private readonly geo;
    constructor(geo: GeoService);
    create(dto: CreateGeoDto, idempotencyKey?: string): Promise<import("../response/geo.response.js").GeoResponse>;
    update(id: string, dto: UpdateGeoDto): Promise<import("../response/geo.response.js").GeoResponse>;
}
