import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { FarmersModule } from '../farmers/farmers.module.js';
import {
  AdminNotificationsController,
  LocalNotificationsController,
  MyNotificationsController,
  SmsWebhookController,
} from './controller/notifications.controller.js';
import { Notification, NotificationSchema } from './schema/notification.schema.js';
import { NotificationWorker } from './service/notification-worker.js';
import { NotificationsService } from './service/notifications.service.js';
import { MockSmsGateway, SmsGateway } from './service/sms-gateway.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    FarmersModule,
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
    { provide: SmsGateway, useClass: MockSmsGateway },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
