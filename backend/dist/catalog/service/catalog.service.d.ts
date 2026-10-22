import type { Model } from 'mongoose';
import { GeoService } from '../../geo/service/geo.service.js';
import { SeasonsService } from '../../seasons/service/seasons.service.js';
import type { CreateInputDto, CreatePriceDto, UpdateInputDto } from '../dto/catalog.dto.js';
import { type CatalogListResponse, type InputResponse, type PriceResponse } from '../response/catalog.response.js';
import { Input } from '../schema/input.schema.js';
import { Price } from '../schema/price.schema.js';
export interface PriceCandidate {
    id: string;
    regionId?: string;
    unitPriceSantimPerKg: number;
    subsidySantimPerKg: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    approved: boolean;
}
export declare function pickCurrentPrice(candidates: PriceCandidate[], now: Date, regionId?: string): PriceCandidate | null;
export declare class CatalogService {
    private readonly inputs;
    private readonly prices;
    private readonly geo;
    private readonly seasons;
    constructor(inputs: Model<Input>, prices: Model<Price>, geo: GeoService, seasons: SeasonsService);
    list(query: {
        seasonId: string;
        regionId?: string;
        cursor?: string;
        limit?: number;
        now?: Date;
    }): Promise<CatalogListResponse>;
    createInput(input: CreateInputDto): Promise<InputResponse>;
    updateInput(id: string, input: UpdateInputDto): Promise<InputResponse>;
    recordPrice(actorId: string, input: CreatePriceDto): Promise<PriceResponse>;
    approvePrice(actorId: string, id: string): Promise<PriceResponse>;
    private attachPrices;
    private requireInput;
    private requireRegion;
}
