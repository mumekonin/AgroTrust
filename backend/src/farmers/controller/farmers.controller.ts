import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import {
  CurrentPrincipal,
  Public,
  RequireStepUp,
  Roles,
  type Principal,
} from '../../common/guards/auth.decorator.js';
import { setAuthCookies } from '../../auth/auth.cookies.js';
import { toAccessSessionResponse } from '../../auth/response/auth.response.js';
import { ActivateFarmerDto, ImportFarmersDto, ListFarmersQuery } from '../dto/farmers.dto.js';
import { FarmersService } from '../service/farmers.service.js';

@Controller('local-admin/farmers')
export class LocalFarmersController {
  constructor(private readonly farmers: FarmersService) {}

  @Roles(Role.LOCAL_ADMIN, Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN)
  @Get()
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListFarmersQuery) {
    return this.farmers.list(principal, query);
  }

  @Roles(Role.LOCAL_ADMIN, Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN)
  @Patch(':id/verify')
  verify(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.farmers.verify(principal, id);
  }

  @Roles(Role.LOCAL_ADMIN, Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN)
  @Post(':id/activation-code')
  issueCode(@CurrentPrincipal() principal: Principal, @Param('id') id: string) {
    return this.farmers.issueActivationCode(principal, id);
  }
}

@Controller('admin/farmers')
export class AdminFarmersController {
  constructor(private readonly farmers: FarmersService) {}

  @Roles(Role.NATIONAL_ADMIN, Role.REGIONAL_ADMIN)
  @RequireStepUp()
  @Post('import')
  importFarmers(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: ImportFarmersDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!dto.dryRun && !idempotencyKey?.trim()) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
    }
    return this.farmers.importFarmers(principal, dto);
  }
}

@Controller('auth')
export class FarmerActivationController {
  constructor(private readonly farmers: FarmersService) {}

  @Public()
  @Post('activate')
  async activate(
    @Body() dto: ActivateFarmerDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
    }
    const issued = await this.farmers.activate({
      ...dto,
      ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
      userAgent: req.get('user-agent'),
    });
    setAuthCookies(res, issued);
    return toAccessSessionResponse(issued);
  }
}
