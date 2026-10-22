import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CurrentPrincipal, RequireStepUp, Roles, type Principal } from '../../common/guards/auth.decorator.js';
import { CreateCenterDto, ListCenterQuery, UpdateCenterDto } from '../dto/local-centers.dto.js';
import { LocalCentersService } from '../service/local-centers.service.js';

@Controller('admin/local-centers')
export class LocalCentersController {
  constructor(private readonly centers: LocalCentersService) {}

  @Roles(Role.LOCAL_ADMIN, Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN, Role.AUDITOR)
  @Get()
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListCenterQuery) {
    return this.centers.list(principal, query);
  }

  @Roles(Role.LOCAL_ADMIN, Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN, Role.AUDITOR)
  @Get(':id')
  get(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.centers.getById(principal, id);
  }

  @Roles(Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN)
  @RequireStepUp()
  @Post()
  create(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: CreateCenterDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
    }
    return this.centers.create(principal, dto);
  }

  @Roles(Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN)
  @RequireStepUp()
  @Patch(':id')
  update(@CurrentPrincipal() principal: Principal, @Param('id') id: string, @Body() dto: UpdateCenterDto) {
    return this.centers.update(principal, id, dto);
  }
}
