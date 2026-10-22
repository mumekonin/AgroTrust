var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { RequireStepUp, Roles } from '../../common/guards/auth.decorator.js';
import { CreateGeoDto, ListGeoQuery, UpdateGeoDto } from '../dto/geo.dto.js';
import { GeoService } from '../service/geo.service.js';
let GeoController = class GeoController {
    geo;
    constructor(geo) {
        this.geo = geo;
    }
    list(query) {
        return this.geo.list(query);
    }
    get(id) {
        return this.geo.getById(id);
    }
};
__decorate([
    Get(),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ListGeoQuery]),
    __metadata("design:returntype", void 0)
], GeoController.prototype, "list", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GeoController.prototype, "get", null);
GeoController = __decorate([
    Controller('geo'),
    __metadata("design:paramtypes", [GeoService])
], GeoController);
export { GeoController };
let AdminGeoController = class AdminGeoController {
    geo;
    constructor(geo) {
        this.geo = geo;
    }
    create(dto, idempotencyKey) {
        if (!idempotencyKey?.trim()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
        }
        return this.geo.create(dto);
    }
    update(id, dto) {
        return this.geo.update(id, dto);
    }
};
__decorate([
    Roles(Role.NATIONAL_ADMIN),
    RequireStepUp(),
    Post(),
    __param(0, Body()),
    __param(1, Headers('idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateGeoDto, String]),
    __metadata("design:returntype", void 0)
], AdminGeoController.prototype, "create", null);
__decorate([
    Roles(Role.NATIONAL_ADMIN),
    RequireStepUp(),
    Patch(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateGeoDto]),
    __metadata("design:returntype", void 0)
], AdminGeoController.prototype, "update", null);
AdminGeoController = __decorate([
    Controller('admin/geo'),
    __metadata("design:paramtypes", [GeoService])
], AdminGeoController);
export { AdminGeoController };
//# sourceMappingURL=geo.controller.js.map