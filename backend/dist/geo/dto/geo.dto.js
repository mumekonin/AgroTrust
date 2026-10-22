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
import { IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested, } from 'class-validator';
import { GEO_TYPES } from '../schema/geo-unit.schema.js';
export class GeoNameDto {
    en;
    am;
    om;
}
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(120),
    __metadata("design:type", String)
], GeoNameDto.prototype, "en", void 0);
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(120),
    __metadata("design:type", String)
], GeoNameDto.prototype, "am", void 0);
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(120),
    __metadata("design:type", String)
], GeoNameDto.prototype, "om", void 0);
export class CreateGeoDto {
    type;
    code;
    name;
    parentId;
}
__decorate([
    IsIn(GEO_TYPES),
    __metadata("design:type", String)
], CreateGeoDto.prototype, "type", void 0);
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(32),
    __metadata("design:type", String)
], CreateGeoDto.prototype, "code", void 0);
__decorate([
    ValidateNested(),
    Type(() => GeoNameDto),
    __metadata("design:type", GeoNameDto)
], CreateGeoDto.prototype, "name", void 0);
__decorate([
    IsOptional(),
    IsMongoId(),
    __metadata("design:type", String)
], CreateGeoDto.prototype, "parentId", void 0);
export class UpdateGeoDto {
    code;
    name;
}
__decorate([
    IsOptional(),
    IsString(),
    MinLength(1),
    MaxLength(32),
    __metadata("design:type", String)
], UpdateGeoDto.prototype, "code", void 0);
__decorate([
    IsOptional(),
    ValidateNested(),
    Type(() => GeoNameDto),
    __metadata("design:type", GeoNameDto)
], UpdateGeoDto.prototype, "name", void 0);
export class ListGeoQuery {
    parentId;
    cursor;
    limit;
}
__decorate([
    IsOptional(),
    IsMongoId(),
    __metadata("design:type", String)
], ListGeoQuery.prototype, "parentId", void 0);
__decorate([
    IsOptional(),
    IsMongoId(),
    __metadata("design:type", String)
], ListGeoQuery.prototype, "cursor", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    Max(100),
    __metadata("design:type", Number)
], ListGeoQuery.prototype, "limit", void 0);
//# sourceMappingURL=geo.dto.js.map