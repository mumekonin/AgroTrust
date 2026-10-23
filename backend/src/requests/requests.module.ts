import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AllocationsModule } from '../allocations/allocations.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { FarmersModule } from '../farmers/farmers.module.js';
import { LocalCentersModule } from '../local-centers/local-centers.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SeasonsModule } from '../seasons/seasons.module.js';
import { UsersModule } from '../users/users.module.js';
import { LocalRequestsController, RequestsController } from './controller/requests.controller.js';
import { InputRequest, InputRequestSchema, RequestCounter, RequestCounterSchema } from './schema/input-request.schema.js';
import { RequestPaymentService } from './service/request-payment.service.js';
import { RequestRequisitionService } from './service/request-requisition.service.js';
import { RequestsService } from './service/requests.service.js';

@Module({
  imports: [
    AllocationsModule,
    AuditModule,
    AuthModule,
    CatalogModule,
    FarmersModule,
    LocalCentersModule,
    NotificationsModule,
    SeasonsModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: InputRequest.name, schema: InputRequestSchema },
      { name: RequestCounter.name, schema: RequestCounterSchema },
    ]),
  ],
  controllers: [RequestsController, LocalRequestsController],
  providers: [RequestsService, RequestRequisitionService, RequestPaymentService],
  exports: [RequestsService, RequestRequisitionService, RequestPaymentService],
})
export class RequestsModule {}
