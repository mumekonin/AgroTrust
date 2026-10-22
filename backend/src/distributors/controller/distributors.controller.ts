import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import {
  CurrentPrincipal,
  RequireStepUp,
  Roles,
  type Principal,
} from '../../common/guards/auth.decorator.js';
import {
  CreateAssignmentDto,
  CreateDistributorDto,
  ListAssignmentQuery,
  ListDistributorQuery,
  UpdateAssignmentDto,
  UpdateDistributorDto,
} from '../dto/distributors.dto.js';
import { DistributorsService } from '../service/distributors.service.js';

const READ_ROLES = [Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN, Role.AUDITOR] as const;
const WRITE_ROLES = [Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN] as const;

@Controller('admin/distributors')
export class DistributorsController {
  constructor(private readonly distributors: DistributorsService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListDistributorQuery) {
    return this.distributors.list(principal, query);
  }

  @Roles(...READ_ROLES)
  @Get(':id')
  get(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.distributors.getById(principal, id);
  }

  @Roles(...WRITE_ROLES)
  @RequireStepUp()
  @Post()
  create(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: CreateDistributorDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.distributors.create(principal, dto);
  }

  @Roles(...WRITE_ROLES)
  @RequireStepUp()
  @Patch(':id')
  update(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body() dto: UpdateDistributorDto,
  ) {
    return this.distributors.update(principal, id, dto);
  }
}

@Controller('admin/distributor-assignments')
export class DistributorAssignmentsController {
  constructor(private readonly distributors: DistributorsService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListAssignmentQuery) {
    return this.distributors.listAssignments(principal, query);
  }

  @Roles(...READ_ROLES)
  @Get(':id')
  get(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.distributors.getAssignment(principal, id);
  }

  @Roles(...WRITE_ROLES)
  @RequireStepUp()
  @Post()
  create(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: CreateAssignmentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.distributors.createAssignment(principal, dto);
  }

  @Roles(...WRITE_ROLES)
  @RequireStepUp()
  @Patch(':id')
  update(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.distributors.updateAssignment(principal, id, dto);
  }
}

function requireIdempotencyKey(idempotencyKey?: string): void {
  if (!idempotencyKey?.trim()) {
    throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
  }
}
