var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested, } from 'class-validator';
import { INPUT_CATEGORIES } from '../schema/input.schema.js';
export class InputNameDto {
    en;
    am;
    om;
}
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(120),
    __metadata("design:type", String)
], InputNameDto.prototype, "en", void 0);
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(120),
    __metadata("design:type", String)
], InputNameDto.prototype, "am", void 0);
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(120),
    __metadata("design:type", String)
], InputNameDto.prototype, "om", void 0);
export class CreateInputDto {
    code;
    name;
    category;
    packSizeKg;
    active;
}
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(32),
    __metadata("design:type", String)
], CreateInputDto.prototype, "code", void 0);
__decorate([
    ValidateNested(),
    Type(() => InputNameDto),
    __metadata("design:type", InputNameDto)
], CreateInputDto.prototype, "name", void 0);
__decorate([
    IsIn(INPUT_CATEGORIES),
    __metadata("design:type", String)
], CreateInputDto.prototype, "category", void 0);
__decorate([
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], CreateInputDto.prototype, "packSizeKg", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], CreateInputDto.prototype, "active", void 0);
export class UpdateInputDto {
    name;
    packSizeKg;
    active;
}
__decorate([
    IsOptional(),
    ValidateNested(),
    Type(() => InputNameDto),
    __metadata("design:type", InputNameDto)
], UpdateInputDto.prototype, "name", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], UpdateInputDto.prototype, "packSizeKg", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], UpdateInputDto.prototype, "active", void 0);
export class ListCatalogQuery {
    seasonId;
    regionId;
    cursor;
    limit;
}
__decorate([
    IsMongoId(),
    __metadata("design:type", String)
], ListCatalogQuery.prototype, "seasonId", void 0);
__decorate([
    IsOptional(),
    IsMongoId(),
    __metadata("design:type", String)
], ListCatalogQuery.prototype, "regionId", void 0);
__decorate([
    IsOptional(),
    IsMongoId(),
    __metadata("design:type", String)
], ListCatalogQuery.prototype, "cursor", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    Max(100),
    __metadata("design:type", Number)
], ListCatalogQuery.prototype, "limit", void 0);
export class CreatePriceDto {
    inputId;
    seasonId;
    regionId;
    unitPriceSantimPerKg;
    subsidySantimPerKg;
    effectiveFrom;
    effectiveTo;
    reason;
}
__decorate([
    IsMongoId(),
    __metadata("design:type", String)
], CreatePriceDto.prototype, "inputId", void 0);
__decorate([
    IsMongoId(),
    __metadata("design:type", String)
], CreatePriceDto.prototype, "seasonId", void 0);
__decorate([
    IsOptional(),
    IsMongoId(),
    __metadata("design:type", String)
], CreatePriceDto.prototype, "regionId", void 0);
__decorate([
    Type(() => Number),
    IsInt(),
    Min(0),
    __metadata("design:type", Number)
], CreatePriceDto.prototype, "unitPriceSantimPerKg", void 0);
__decorate([
    Type(() => Number),
    IsInt(),
    Min(0),
    __metadata("design:type", Number)
], CreatePriceDto.prototype, "subsidySantimPerKg", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], CreatePriceDto.prototype, "effectiveFrom", void 0);
__decorate([
    IsOptional(),
    IsDateString(),
    __metadata("design:type", String)
], CreatePriceDto.prototype, "effectiveTo", void 0);
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(500),
    __metadata("design:type", String)
], CreatePriceDto.prototype, "reason", void 0);
//# sourceMappingURL=catalog.dto.js.map