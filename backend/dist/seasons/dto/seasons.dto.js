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
import { IsDateString, IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min, MinLength, } from 'class-validator';
import { PRIORITY_POLICIES, SEASON_STATUSES, } from '../schema/season.schema.js';
export class CreateSeasonDto {
    code;
    name;
    startsAt;
    endsAt;
    requestsOpenAt;
    requestsCloseAt;
    requisitionCutoffAt;
    paymentWindowDays;
    pickupWindowDays;
    priorityPolicy;
    status;
}
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(32),
    __metadata("design:type", String)
], CreateSeasonDto.prototype, "code", void 0);
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(120),
    __metadata("design:type", String)
], CreateSeasonDto.prototype, "name", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], CreateSeasonDto.prototype, "startsAt", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], CreateSeasonDto.prototype, "endsAt", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], CreateSeasonDto.prototype, "requestsOpenAt", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], CreateSeasonDto.prototype, "requestsCloseAt", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], CreateSeasonDto.prototype, "requisitionCutoffAt", void 0);
__decorate([
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], CreateSeasonDto.prototype, "paymentWindowDays", void 0);
__decorate([
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], CreateSeasonDto.prototype, "pickupWindowDays", void 0);
__decorate([
    IsOptional(),
    IsIn(PRIORITY_POLICIES),
    __metadata("design:type", String)
], CreateSeasonDto.prototype, "priorityPolicy", void 0);
__decorate([
    IsOptional(),
    IsIn(SEASON_STATUSES),
    __metadata("design:type", String)
], CreateSeasonDto.prototype, "status", void 0);
export class ReplaceSeasonDto {
    code;
    name;
    startsAt;
    endsAt;
    requestsOpenAt;
    requestsCloseAt;
    requisitionCutoffAt;
    paymentWindowDays;
    pickupWindowDays;
    priorityPolicy;
    status;
}
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(32),
    __metadata("design:type", String)
], ReplaceSeasonDto.prototype, "code", void 0);
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(120),
    __metadata("design:type", String)
], ReplaceSeasonDto.prototype, "name", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], ReplaceSeasonDto.prototype, "startsAt", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], ReplaceSeasonDto.prototype, "endsAt", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], ReplaceSeasonDto.prototype, "requestsOpenAt", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], ReplaceSeasonDto.prototype, "requestsCloseAt", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], ReplaceSeasonDto.prototype, "requisitionCutoffAt", void 0);
__decorate([
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ReplaceSeasonDto.prototype, "paymentWindowDays", void 0);
__decorate([
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ReplaceSeasonDto.prototype, "pickupWindowDays", void 0);
__decorate([
    IsIn(PRIORITY_POLICIES),
    __metadata("design:type", String)
], ReplaceSeasonDto.prototype, "priorityPolicy", void 0);
__decorate([
    IsIn(SEASON_STATUSES),
    __metadata("design:type", String)
], ReplaceSeasonDto.prototype, "status", void 0);
export class ListSeasonQuery {
    cursor;
    limit;
}
__decorate([
    IsOptional(),
    IsMongoId(),
    __metadata("design:type", String)
], ListSeasonQuery.prototype, "cursor", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    Max(100),
    __metadata("design:type", Number)
], ListSeasonQuery.prototype, "limit", void 0);
//# sourceMappingURL=seasons.dto.js.map