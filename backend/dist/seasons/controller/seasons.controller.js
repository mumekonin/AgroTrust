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
import { Body, Controller, Get, Headers, Param, Post, Put, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { RequireStepUp, Roles } from '../../common/guards/auth.decorator.js';
import { CreateSeasonDto, ListSeasonQuery, ReplaceSeasonDto } from '../dto/seasons.dto.js';
import { SeasonsService } from '../service/seasons.service.js';
let SeasonsController = class SeasonsController {
    seasons;
    constructor(seasons) {
        this.seasons = seasons;
    }
    list(query) {
        return this.seasons.list(query);
    }
    get(id) {
        return this.seasons.getById(id);
    }
};
__decorate([
    Get(),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ListSeasonQuery]),
    __metadata("design:returntype", void 0)
], SeasonsController.prototype, "list", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SeasonsController.prototype, "get", null);
SeasonsController = __decorate([
    Controller('seasons'),
    __metadata("design:paramtypes", [SeasonsService])
], SeasonsController);
export { SeasonsController };
let AdminSeasonsController = class AdminSeasonsController {
    seasons;
    constructor(seasons) {
        this.seasons = seasons;
    }
    create(dto, idempotencyKey) {
        if (!idempotencyKey?.trim()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
        }
        return this.seasons.create(dto);
    }
    replace(id, dto) {
        return this.seasons.replace(id, dto);
    }
};
__decorate([
    Roles(Role.NATIONAL_ADMIN),
    RequireStepUp(),
    Post(),
    __param(0, Body()),
    __param(1, Headers('idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateSeasonDto, String]),
    __metadata("design:returntype", void 0)
], AdminSeasonsController.prototype, "create", null);
__decorate([
    Roles(Role.NATIONAL_ADMIN),
    RequireStepUp(),
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ReplaceSeasonDto]),
    __metadata("design:returntype", void 0)
], AdminSeasonsController.prototype, "replace", null);
AdminSeasonsController = __decorate([
    Controller('admin/seasons'),
    __metadata("design:paramtypes", [SeasonsService])
], AdminSeasonsController);
export { AdminSeasonsController };
//# sourceMappingURL=seasons.controller.js.map