import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { CurrentPrincipal, Roles, type Principal } from '../../common/guards/auth.decorator.js';
import { AnalyticsQuery } from '../dto/analytics.dto.js';
import { AnalyticsService } from '../service/analytics.service.js';

@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Roles(Role.LOCAL_ADMIN, Role.DISTRIBUTOR_STAFF, Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN, Role.AUDITOR)
  @Get('overview')
  overview(@CurrentPrincipal() principal: Principal, @Query() query: AnalyticsQuery) {
    return this.analytics.overview(principal, query);
  }

  @Roles(Role.LOCAL_ADMIN, Role.DISTRIBUTOR_STAFF, Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN, Role.AUDITOR)
  @Get('shortages')
  shortages(@CurrentPrincipal() principal: Principal, @Query() query: AnalyticsQuery) {
    return this.analytics.shortages(principal, query);
  }

  @Roles(Role.LOCAL_ADMIN, Role.DISTRIBUTOR_STAFF, Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN, Role.AUDITOR)
  @Get('pipeline')
  pipeline(@CurrentPrincipal() principal: Principal, @Query() query: AnalyticsQuery) {
    return this.analytics.pipeline(principal, query);
  }
}
