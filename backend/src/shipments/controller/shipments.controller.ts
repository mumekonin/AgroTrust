import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CurrentPrincipal, RequireStepUp, Roles, type Principal } from '../../common/guards/auth.decorator.js';
import {
  CreateBatchDto,
  CreateShipmentDto,
  ListShipmentQuery,
  ReceiveShipmentDto,
  ResolveDiscrepancyDto,
  UpdateShipmentDto,
} from '../dto/shipments.dto.js';
import { BatchService } from '../service/batch.service.js';
import { ShipmentsService } from '../service/shipments.service.js';

@Controller('distributor')
export class DistributorShipmentsController {
  constructor(
    private readonly batches: BatchService,
    private readonly shipments: ShipmentsService,
  ) {}

  @Roles(Role.DISTRIBUTOR_STAFF)
  @Post('batches')
  createBatch(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: CreateBatchDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.batches.create(principal, dto, requireIdempotencyKey(idempotencyKey), userAgent);
  }

  @Roles(Role.DISTRIBUTOR_STAFF)
  @Post('shipments')
  createShipment(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: CreateShipmentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.shipments.create(principal, dto, requireIdempotencyKey(idempotencyKey), userAgent);
  }

  @Roles(Role.DISTRIBUTOR_STAFF)
  @Patch('shipments/:id')
  updateShipment(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body() dto: UpdateShipmentDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.shipments.update(principal, id, dto, userAgent);
  }
}

@Controller('local-admin/shipments')
export class LocalShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Roles(Role.LOCAL_ADMIN)
  @Get()
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListShipmentQuery) {
    return this.shipments.listIncoming(principal, query);
  }

  @Roles(Role.LOCAL_ADMIN)
  @RequireStepUp()
  @Post(':id/receive')
  receive(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body() dto: ReceiveShipmentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.shipments.receive(principal, id, dto, userAgent);
  }
}

@Controller('admin/shipments')
export class AdminShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Roles(Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN)
  @RequireStepUp()
  @Post(':id/resolve-discrepancy')
  resolve(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body() dto: ResolveDiscrepancyDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.shipments.resolve(principal, id, dto, userAgent);
  }
}

function requireIdempotencyKey(idempotencyKey?: string): string {
  const key = idempotencyKey?.trim();
  if (!key) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
  if (key.length > 200) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is too long');
  return key;
}
