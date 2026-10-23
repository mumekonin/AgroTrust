import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CurrentPrincipal, RequireStepUp, Roles, type Principal } from '../../common/guards/auth.decorator.js';
import { CompletePickupDto, VerifyPickupDto } from '../dto/pickups.dto.js';
import { PickupsService } from '../service/pickups.service.js';

@Controller('local-admin/pickups')
export class LocalPickupsController {
  constructor(private readonly pickups: PickupsService) {}

  @Roles(Role.LOCAL_ADMIN)
  @Post('verify')
  verify(@CurrentPrincipal() principal: Principal, @Body() dto: VerifyPickupDto) {
    return this.pickups.verify(principal, dto);
  }

  @Roles(Role.LOCAL_ADMIN)
  @RequireStepUp()
  @Post(':requestId/complete')
  complete(
    @CurrentPrincipal() principal: Principal,
    @Param('requestId') requestId: string,
    @Body() dto: CompletePickupDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.pickups.complete(principal, requestId, dto, requireIdempotencyKey(idempotencyKey), userAgent);
  }
}

@Controller('admin/overrides')
export class OverrideController {
  constructor(private readonly pickups: PickupsService) {}

  @Roles(Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN)
  @RequireStepUp()
  @Post(':id/approve')
  approve(
    @CurrentPrincipal() principal: Principal,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.pickups.approve(principal, id, userAgent);
  }
}

function requireIdempotencyKey(idempotencyKey?: string): string {
  const key = idempotencyKey?.trim();
  if (!key) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is required');
  if (key.length > 200) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Idempotency-Key is too long');
  return key;
}
