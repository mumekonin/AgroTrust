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
import { Body, Controller, Get, Headers, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CurrentPrincipal, RequireStepUp, Roles } from '../../common/guards/auth.decorator.js';
import { CreateInputDto, CreatePriceDto, ListCatalogQuery, UpdateInputDto } from '../dto/catalog.dto.js';
import { CatalogService } from '../service/catalog.service.js';
let CatalogController = class CatalogController {
    catalog;
    constructor(catalog) {
        this.catalog = catalog;
    }
    list(query) {
        return this.catalog.list(query);
    }
};
__decorate([
    Get(),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ListCatalogQuery]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "list", null);
CatalogController = __decorate([
    Controller('catalog'),
    __metadata("design:paramtypes", [CatalogService])
], CatalogController);
export { CatalogController };
let AdminCatalogController = class AdminCatalogController {
    catalog;
    constructor(catalog) {
        this.catalog = catalog;
    }
    createInput(dto, idempotencyKey) {
        if (!idempotencyKey?.trim()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
        }
        return this.catalog.createInput(dto);
    }
    updateInput(id, dto) {
        return this.catalog.updateInput(id, dto);
    }
    recordPrice(principal, dto, idempotencyKey) {
        if (!idempotencyKey?.trim()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
        }
        return this.catalog.recordPrice(principal.userId, dto);
    }
    approvePrice(principal, id) {
        return this.catalog.approvePrice(principal.userId, id);
    }
};
__decorate([
    Roles(Role.NATIONAL_ADMIN),
    RequireStepUp(),
    Post('inputs'),
    __param(0, Body()),
    __param(1, Headers('idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateInputDto, String]),
    __metadata("design:returntype", void 0)
], AdminCatalogController.prototype, "createInput", null);
__decorate([
    Roles(Role.NATIONAL_ADMIN),
    RequireStepUp(),
    Patch('inputs/:id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateInputDto]),
    __metadata("design:returntype", void 0)
], AdminCatalogController.prototype, "updateInput", null);
__decorate([
    Roles(Role.NATIONAL_ADMIN),
    RequireStepUp(),
    Put('prices'),
    __param(0, CurrentPrincipal()),
    __param(1, Body()),
    __param(2, Headers('idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreatePriceDto, String]),
    __metadata("design:returntype", void 0)
], AdminCatalogController.prototype, "recordPrice", null);
__decorate([
    Roles(Role.NATIONAL_ADMIN),
    RequireStepUp(),
    Post('prices/:id/approve'),
    __param(0, CurrentPrincipal()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminCatalogController.prototype, "approvePrice", null);
AdminCatalogController = __decorate([
    Controller('admin'),
    __metadata("design:paramtypes", [CatalogService])
], AdminCatalogController);
export { AdminCatalogController };
//# sourceMappingURL=catalog.controller.js.map