import type { Model } from 'mongoose';
import type { CreateSeasonDto, ReplaceSeasonDto } from '../dto/seasons.dto.js';
import { type SeasonListResponse, type SeasonResponse } from '../response/seasons.response.js';
import { Season } from '../schema/season.schema.js';
export declare class SeasonsService {
    private readonly model;
    constructor(model: Model<Season>);
    list(query: {
        cursor?: string;
        limit?: number;
    }): Promise<SeasonListResponse>;
    getById(id: string): Promise<SeasonResponse>;
    create(input: CreateSeasonDto): Promise<SeasonResponse>;
    replace(id: string, input: ReplaceSeasonDto): Promise<SeasonResponse>;
}
