import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { RequireStepUp, Roles } from '../../common/guards/auth.decorator.js';
import { CreateGeoDto, ListGeoQuery, UpdateGeoDto } from '../dto/geo.dto.js';
import { GeoService } from '../service/geo.service.js';

@Controller('geo')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get()
  list(@Query() query: ListGeoQuery) {
    return this.geo.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.geo.getById(id);
  }
}

@Controller('admin/geo')
export class AdminGeoController {
  constructor(private readonly geo: GeoService) {}

  @Roles(Role.NATIONAL_ADMIN)
  @RequireStepUp()
  @Post()
  create(@Body() dto: CreateGeoDto, @Headers('idempotency-key') idempotencyKey?: string) {
    if (!idempotencyKey?.trim()) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
    }
    return this.geo.create(dto);
  }

  @Roles(Role.NATIONAL_ADMIN)
  @RequireStepUp()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGeoDto) {
    return this.geo.update(id, dto);
  }
}
