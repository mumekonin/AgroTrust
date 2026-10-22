import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { DistributorsModule } from '../distributors/distributors.module.js';
import { FarmersModule } from '../farmers/farmers.module.js';
import { GeoModule } from '../geo/geo.module.js';
import { LocalCentersModule } from '../local-centers/local-centers.module.js';
import { RequestsModule } from '../requests/requests.module.js';
import { SeasonsModule } from '../seasons/seasons.module.js';
import {
  DistributorRequisitionsController,
  LocalRequisitionsController,
} from './controller/requisitions.controller.js';
import {
  Requisition,
  RequisitionCounter,
  RequisitionCounterSchema,
  RequisitionSchema,
} from './schema/requisition.schema.js';
import { RequisitionWorker } from './service/requisition-worker.js';
import { RequisitionsService } from './service/requisitions.service.js';

@Module({
  imports: [
    RequestsModule,
    DistributorsModule,
    CatalogModule,
    SeasonsModule,
    LocalCentersModule,
    FarmersModule,
    GeoModule,
    AuditModule,
    MongooseModule.forFeature([
      { name: Requisition.name, schema: RequisitionSchema },
      { name: RequisitionCounter.name, schema: RequisitionCounterSchema },
    ]),
  ],
  controllers: [LocalRequisitionsController, DistributorRequisitionsController],
  providers: [RequisitionsService, RequisitionWorker],
  exports: [RequisitionsService],
})
export class RequisitionsModule {}
