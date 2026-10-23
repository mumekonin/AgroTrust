import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CurrentPrincipal, RequireStepUp, Roles, type Principal } from '../../common/guards/auth.decorator.js';
import { ListFlagQuery, ResolveFlagDto } from '../dto/fraud.dto.js';
import { FraudService } from '../service/fraud.service.js';

@Controller('admin/fraud-flags')
export class FraudController {
  constructor(private readonly fraud: FraudService) {}

  @Roles(Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN, Role.AUDITOR)
  @Get()
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListFlagQuery) {
    return this.fraud.list(principal, query);
  }

  @Roles(Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN)
  @RequireStepUp()
  @Post(':id/resolve')
  resolve(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body() dto: ResolveFlagDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.fraud.resolve(principal, id, dto);
  }
}

function requireIdempotencyKey(idempotencyKey?: string): void {
  const key = idempotencyKey?.trim();
  if (!key) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
  if (key.length > 200) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is too long');
}
