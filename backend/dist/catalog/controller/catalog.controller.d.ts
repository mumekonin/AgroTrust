import { type Principal } from '../../common/guards/auth.decorator.js';
import { CreateInputDto, CreatePriceDto, ListCatalogQuery, UpdateInputDto } from '../dto/catalog.dto.js';
import { CatalogService } from '../service/catalog.service.js';
export declare class CatalogController {
    private readonly catalog;
    constructor(catalog: CatalogService);
    list(query: ListCatalogQuery): Promise<import("../response/catalog.response.js").CatalogListResponse>;
}
export declare class AdminCatalogController {
    private readonly catalog;
    constructor(catalog: CatalogService);
    createInput(dto: CreateInputDto, idempotencyKey?: string): Promise<import("../response/catalog.response.js").InputResponse>;
    updateInput(id: string, dto: UpdateInputDto): Promise<import("../response/catalog.response.js").InputResponse>;
    recordPrice(principal: Principal, dto: CreatePriceDto, idempotencyKey?: string): Promise<import("../response/catalog.response.js").PriceResponse>;
    approvePrice(principal: Principal, id: string): Promise<import("../response/catalog.response.js").PriceResponse>;
}
