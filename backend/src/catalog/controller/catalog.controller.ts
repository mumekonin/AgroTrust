import { Body, Controller, Get, Headers, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CurrentPrincipal, RequireStepUp, Roles, type Principal } from '../../common/guards/auth.decorator.js';
import { CreateInputDto, CreatePriceDto, ListCatalogQuery, UpdateInputDto } from '../dto/catalog.dto.js';
import { CatalogService } from '../service/catalog.service.js';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@Query() query: ListCatalogQuery) {
    return this.catalog.list(query);
  }
}

@Controller('admin')
export class AdminCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Roles(Role.NATIONAL_ADMIN)
  @RequireStepUp()
  @Post('inputs')
  createInput(@Body() dto: CreateInputDto, @Headers('idempotency-key') idempotencyKey?: string) {
    if (!idempotencyKey?.trim()) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
    }
    return this.catalog.createInput(dto);
  }

  @Roles(Role.NATIONAL_ADMIN)
  @RequireStepUp()
  @Patch('inputs/:id')
  updateInput(@Param('id') id: string, @Body() dto: UpdateInputDto) {
    return this.catalog.updateInput(id, dto);
  }

  @Roles(Role.NATIONAL_ADMIN)
  @RequireStepUp()
  @Put('prices')
  recordPrice(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: CreatePriceDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
    }
    return this.catalog.recordPrice(principal.userId, dto);
  }

  @Roles(Role.NATIONAL_ADMIN)
  @RequireStepUp()
  @Post('prices/:id/approve')
  approvePrice(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.catalog.approvePrice(principal.userId, id);
  }
}
