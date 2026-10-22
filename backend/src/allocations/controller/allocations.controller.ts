import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CurrentPrincipal, RequireStepUp, Roles, type Principal } from '../../common/guards/auth.decorator.js';
import {
  AdjustAllocationDto,
  CreateAllocationRuleDto,
  GenerateAllocationsDto,
  ListAllocationQuery,
} from '../dto/allocations.dto.js';
import { AllocationsService } from '../service/allocations.service.js';

@Controller('me')
export class MyAllocationsController {
  constructor(private readonly allocations: AllocationsService) {}

  @Roles(Role.FARMER)
  @Get('allocations')
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListAllocationQuery) {
    return this.allocations.listMine(principal, query);
  }
}

@Controller('admin')
export class AdminAllocationsController {
  constructor(private readonly allocations: AllocationsService) {}

  @Roles(Role.NATIONAL_ADMIN, Role.REGIONAL_ADMIN)
  @RequireStepUp()
  @Post('allocation-rules')
  createRule(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: CreateAllocationRuleDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.allocations.createRule(principal, dto, userAgent);
  }

  @Roles(Role.NATIONAL_ADMIN, Role.REGIONAL_ADMIN)
  @RequireStepUp()
  @Post('allocation-rules/:id/approve')
  approve(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.allocations.approveRule(principal, id, userAgent);
  }

  @Roles(Role.NATIONAL_ADMIN, Role.REGIONAL_ADMIN)
  @RequireStepUp()
  @Post('allocations/generate')
  generate(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: GenerateAllocationsDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.allocations.generate(principal, dto.ruleId, userAgent);
  }

  @Roles(Role.NATIONAL_ADMIN, Role.REGIONAL_ADMIN)
  @RequireStepUp()
  @Post('allocations/adjustments')
  adjust(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: AdjustAllocationDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.allocations.adjust(principal, dto, userAgent);
  }
}

function requireIdempotencyKey(idempotencyKey?: string): void {
  if (!idempotencyKey?.trim()) {
    throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
  }
}
