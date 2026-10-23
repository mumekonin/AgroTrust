import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { MetricsController } from './metrics.controller.js';
import { MetricsInterceptor } from './metrics.interceptor.js';
import { MetricsService } from './metrics.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [MetricsController],
  providers: [MetricsService, { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor }],
})
export class MetricsModule {}
