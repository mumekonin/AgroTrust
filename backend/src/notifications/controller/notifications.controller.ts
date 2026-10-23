import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Role } from '../../common/enums/role.enum.js';
import {
  CurrentPrincipal,
  Public,
  Roles,
  type Principal,
} from '../../common/guards/auth.decorator.js';
import { DeliveryReportDto, ListNotificationQuery } from '../dto/notifications.dto.js';
import { NotificationsService } from '../service/notifications.service.js';

@Controller('me/notifications')
export class MyNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListNotificationQuery) {
    return this.notifications.listMine(principal, query);
  }
}

@Controller('local-admin/notifications')
export class LocalNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Roles(Role.LOCAL_ADMIN)
  @Get()
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListNotificationQuery) {
    return this.notifications.listManual(principal, query);
  }
}

@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Roles(Role.REGIONAL_ADMIN, Role.NATIONAL_ADMIN, Role.AUDITOR)
  @Get()
  list(@CurrentPrincipal() principal: Principal, @Query() query: ListNotificationQuery) {
    return this.notifications.listForAdmin(principal, query);
  }
}

@Controller('webhooks/sms')
export class SmsWebhookController {
  constructor(private readonly notifications: NotificationsService) {}

  @Public()
  @SkipThrottle()
  @Post('delivery-reports')
  report(@Body() dto: DeliveryReportDto, @Headers('x-sms-signature') signature?: string) {
    return this.notifications.applyDeliveryReport(dto, signature);
  }
}
