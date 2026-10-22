import { type InputCategory } from '../schema/input.schema.js';
export declare class InputNameDto {
    en: string;
    am: string;
    om: string;
}
export declare class CreateInputDto {
    code: string;
    name: InputNameDto;
    category: InputCategory;
    packSizeKg: number;
    active?: boolean;
}
export declare class UpdateInputDto {
    name?: InputNameDto;
    packSizeKg?: number;
    active?: boolean;
}
export declare class ListCatalogQuery {
    seasonId: string;
    regionId?: string;
    cursor?: string;
    limit?: number;
}
export declare class CreatePriceDto {
    inputId: string;
    seasonId: string;
    regionId?: string;
    unitPriceSantimPerKg: number;
    subsidySantimPerKg: number;
    effectiveFrom: string;
    effectiveTo?: string;
    reason: string;
}
