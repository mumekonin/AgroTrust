import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module.js';
import { FarmersModule } from '../farmers/farmers.module.js';
import { LocalCentersModule } from '../local-centers/local-centers.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { RequestsModule } from '../requests/requests.module.js';
import { RequisitionsModule } from '../requisitions/requisitions.module.js';
import { UsersModule } from '../users/users.module.js';
import {
  AdminPaymentsController,
  DistributorPaymentsController,
  LocalPaymentController,
} from './controller/payments.controller.js';
import { Payment, PaymentSchema } from './schema/payment.schema.js';
import { PaymentWorker } from './service/payment-worker.js';
import { PaymentsService } from './service/payments.service.js';

@Module({
  imports: [
    RequestsModule,
    RequisitionsModule,
    LocalCentersModule,
    FarmersModule,
    UsersModule,
    NotificationsModule,
    AuditModule,
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
  ],
  controllers: [LocalPaymentController, DistributorPaymentsController, AdminPaymentsController],
  providers: [PaymentsService, PaymentWorker],
  exports: [PaymentsService],
})
export class PaymentsModule {}
