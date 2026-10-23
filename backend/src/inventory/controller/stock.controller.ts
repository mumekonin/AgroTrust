import { Controller, Get } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { CurrentPrincipal, Roles, type Principal } from '../../common/guards/auth.decorator.js';
import { LocalCentersService } from '../../local-centers/service/local-centers.service.js';
import { StockService } from '../service/stock.service.js';

@Controller('local-admin/stock')
export class StockController {
  constructor(
    private readonly stock: StockService,
    private readonly centers: LocalCentersService,
  ) {}

  @Roles(Role.LOCAL_ADMIN)
  @Get()
  async list(@CurrentPrincipal() principal: Principal) {
    if (!principal.roles.includes(Role.LOCAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const centerIds = await this.centers.idsInScope(principal);
    const items = await this.stock.listForCenters(centerIds);
    return { items };
  }
}
