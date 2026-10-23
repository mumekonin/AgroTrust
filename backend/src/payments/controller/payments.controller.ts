import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CurrentPrincipal, RequireStepUp, Roles, type Principal } from '../../common/guards/auth.decorator.js';
import { ConfirmPaymentDto, ListPaymentQuery } from '../dto/payments.dto.js';
import { PaymentsService } from '../service/payments.service.js';

@Controller('local-admin/input-requests')
export class LocalPaymentController {
  constructor(private readonly payments: PaymentsService) {}

  @Roles(Role.LOCAL_ADMIN)
  @RequireStepUp()
  @Post(':id/confirm-payment')
  confirm(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.payments.confirm(principal, id, dto, requireIdempotencyKey(idempotencyKey), userAgent);
  }
}

@Controller('distributor/payments')
export class DistributorPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Roles(Role.DISTRIBUTOR_STAFF)
  @Get()
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListPaymentQuery) {
    return this.payments.listForDistributor(principal, query);
  }
}

@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Roles(Role.NATIONAL_ADMIN, Role.REGIONAL_ADMIN, Role.AUDITOR)
  @Get()
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListPaymentQuery) {
    return this.payments.listForAdmin(principal, query);
  }
}

function requireIdempotencyKey(idempotencyKey?: string): string {
  const key = idempotencyKey?.trim();
  if (!key) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
  if (key.length > 200) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is too long');
  return key;
}
