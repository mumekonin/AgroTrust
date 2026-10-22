import { Body, Controller, Get, Headers, Param, Post, Put, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { RequireStepUp, Roles } from '../../common/guards/auth.decorator.js';
import { CreateSeasonDto, ListSeasonQuery, ReplaceSeasonDto } from '../dto/seasons.dto.js';
import { SeasonsService } from '../service/seasons.service.js';

@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasons: SeasonsService) {}

  @Get()
  list(@Query() query: ListSeasonQuery) {
    return this.seasons.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.seasons.getById(id);
  }
}

@Controller('admin/seasons')
export class AdminSeasonsController {
  constructor(private readonly seasons: SeasonsService) {}

  @Roles(Role.NATIONAL_ADMIN)
  @RequireStepUp()
  @Post()
  create(@Body() dto: CreateSeasonDto, @Headers('idempotency-key') idempotencyKey?: string) {
    if (!idempotencyKey?.trim()) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
    }
    return this.seasons.create(dto);
  }

  @Roles(Role.NATIONAL_ADMIN)
  @RequireStepUp()
  @Put(':id')
  replace(@Param('id') id: string, @Body() dto: ReplaceSeasonDto) {
    return this.seasons.replace(id, dto);
  }
}
