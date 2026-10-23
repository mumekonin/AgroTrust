import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import type { Env } from '../config/env.schema.js';
import { FarmersModule } from '../farmers/farmers.module.js';
import { FraudModule } from '../fraud/fraud.module.js';
import {
  AdminNotificationsController,
  LocalNotificationsController,
  MyNotificationsController,
  SmsWebhookController,
} from './controller/notifications.controller.js';
import { Notification, NotificationSchema } from './schema/notification.schema.js';
import { NotificationWorker } from './service/notification-worker.js';
import { NotificationsService } from './service/notifications.service.js';
import { HttpSmsGateway, MockSmsGateway, SmsGateway } from './service/sms-gateway.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    FarmersModule,
    FraudModule,
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
  ],
  controllers: [
    MyNotificationsController,
    LocalNotificationsController,
    AdminNotificationsController,
    SmsWebhookController,
  ],
  providers: [
    NotificationsService,
    NotificationWorker,
    {
      provide: SmsGateway,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        if (config.get('SMS_GATEWAY', { infer: true }) !== 'http') return new MockSmsGateway();
        return new HttpSmsGateway({
          url: config.get('SMS_GATEWAY_URL', { infer: true }) ?? '',
          key: config.get('SMS_GATEWAY_KEY', { infer: true }) ?? '',
          sender: config.get('SMS_SENDER_ID', { infer: true }),
        });
      },
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
