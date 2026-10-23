import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { CurrentPrincipal, Roles, type Principal } from '../../common/guards/auth.decorator.js';
import { ListAuditQuery } from '../dto/audit.dto.js';
import { AuditService } from '../service/audit.service.js';

@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Roles(Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN, Role.AUDITOR)
  @Get()
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListAuditQuery) {
    return this.audit.list(principal, query);
  }
}
