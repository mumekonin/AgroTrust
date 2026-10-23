import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CurrentPrincipal, Roles, type Principal } from '../../common/guards/auth.decorator.js';
import {
  AssistedRequestDto,
  ConfirmAssistedRequestDto,
  CreateRequestDto,
  ListRequestQuery,
  RejectRequestDto,
} from '../dto/requests.dto.js';
import { RequestsService } from '../service/requests.service.js';

@Controller('input-requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Roles(Role.FARMER)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  submit(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: CreateRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.requests.submit(principal, dto, requireIdempotencyKey(idempotencyKey), userAgent);
  }

  @Roles(Role.FARMER)
  @Get('me')
  listMine(@CurrentPrincipal() principal: Principal, @Query() query: ListRequestQuery) {
    return this.requests.listMine(principal, query);
  }

  @Get(':id')
  get(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.requests.getById(principal, id);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.requests.cancel(principal, id, userAgent);
  }
}

@Controller('local-admin/input-requests')
export class LocalRequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Roles(Role.LOCAL_ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  start(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: AssistedRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.requests.startAssisted(principal, dto);
  }

  @Roles(Role.LOCAL_ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':id/confirm')
  confirm(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body() dto: ConfirmAssistedRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.requests.confirmAssisted(principal, id, dto, requireIdempotencyKey(idempotencyKey), userAgent);
  }

  @Roles(Role.LOCAL_ADMIN)
  @Get()
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListRequestQuery) {
    return this.requests.listQueue(principal, query);
  }

  @Roles(Role.LOCAL_ADMIN)
  @Post(':id/approve')
  approve(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.requests.approve(principal, id, userAgent);
  }

  @Roles(Role.LOCAL_ADMIN)
  @Post(':id/reject')
  reject(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body() dto: RejectRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.requests.reject(principal, id, dto.reason, userAgent);
  }
}

function requireIdempotencyKey(idempotencyKey?: string): string {
  const key = idempotencyKey?.trim();
  if (!key) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
  if (key.length > 200) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is too long');
  return key;
}
