import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CurrentPrincipal, RequireStepUp, Roles, type Principal } from '../../common/guards/auth.decorator.js';
import { CreateRequisitionDto, ListRequisitionQuery, RespondRequisitionDto } from '../dto/requisitions.dto.js';
import { RequisitionsService } from '../service/requisitions.service.js';

@Controller('local-admin/requisitions')
export class LocalRequisitionsController {
  constructor(private readonly requisitions: RequisitionsService) {}

  @Roles(Role.LOCAL_ADMIN)
  @RequireStepUp()
  @Post()
  create(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: CreateRequisitionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const key = dto.preview ? 'preview' : requireIdempotencyKey(idempotencyKey);
    return this.requisitions.create(principal, dto, key, userAgent);
  }

  @Roles(Role.LOCAL_ADMIN)
  @RequireStepUp()
  @Post(':id/submit')
  submit(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.requisitions.submit(principal, id, userAgent);
  }
}

@Controller('distributor/requisitions')
export class DistributorRequisitionsController {
  constructor(private readonly requisitions: RequisitionsService) {}

  @Roles(Role.DISTRIBUTOR_STAFF)
  @Get()
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListRequisitionQuery) {
    return this.requisitions.listForDistributor(principal, query);
  }

  @Roles(Role.DISTRIBUTOR_STAFF, Role.LOCAL_ADMIN, Role.NATIONAL_ADMIN, Role.AUDITOR)
  @Get(':id')
  get(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.requisitions.getForDistributor(principal, id, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Roles(Role.DISTRIBUTOR_STAFF)
  @RequireStepUp()
  @Post(':id/respond')
  respond(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body() dto: RespondRequisitionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.requisitions.respond(principal, id, dto, userAgent);
  }
}

function requireIdempotencyKey(idempotencyKey?: string): string {
  const key = idempotencyKey?.trim();
  if (!key) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
  if (key.length > 200) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is too long');
  return key;
}
