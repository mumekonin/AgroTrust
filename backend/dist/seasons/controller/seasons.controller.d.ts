import { CreateSeasonDto, ListSeasonQuery, ReplaceSeasonDto } from '../dto/seasons.dto.js';
import { SeasonsService } from '../service/seasons.service.js';
export declare class SeasonsController {
    private readonly seasons;
    constructor(seasons: SeasonsService);
    list(query: ListSeasonQuery): Promise<import("../response/seasons.response.js").SeasonListResponse>;
    get(id: string): Promise<import("../response/seasons.response.js").SeasonResponse>;
}
export declare class AdminSeasonsController {
    private readonly seasons;
    constructor(seasons: SeasonsService);
    create(dto: CreateSeasonDto, idempotencyKey?: string): Promise<import("../response/seasons.response.js").SeasonResponse>;
    replace(id: string, dto: ReplaceSeasonDto): Promise<import("../response/seasons.response.js").SeasonResponse>;
}
