import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { FraudModule } from '../fraud/fraud.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { LocalCentersModule } from '../local-centers/local-centers.module.js';
import { RequestsModule } from '../requests/requests.module.js';
import { RequisitionsModule } from '../requisitions/requisitions.module.js';
import { SeasonsModule } from '../seasons/seasons.module.js';
import {
  AdminShipmentsController,
  DistributorShipmentsController,
  LocalShipmentsController,
} from './controller/shipments.controller.js';
import { Batch, BatchSchema } from './schema/batch.schema.js';
import { ShipmentAllocation, ShipmentAllocationSchema } from './schema/shipment-allocation.schema.js';
import {
  Shipment,
  ShipmentCounter,
  ShipmentCounterSchema,
  ShipmentSchema,
} from './schema/shipment.schema.js';
import { BatchService } from './service/batch.service.js';
import { ShipmentWorker } from './service/shipment-worker.js';
import { ShipmentsService } from './service/shipments.service.js';

@Module({
  imports: [
    RequestsModule,
    RequisitionsModule,
    SeasonsModule,
    LocalCentersModule,
    CatalogModule,
    InventoryModule,
    FraudModule,
    AuditModule,
    MongooseModule.forFeature([
      { name: Batch.name, schema: BatchSchema },
      { name: Shipment.name, schema: ShipmentSchema },
      { name: ShipmentCounter.name, schema: ShipmentCounterSchema },
      { name: ShipmentAllocation.name, schema: ShipmentAllocationSchema },
    ]),
  ],
  controllers: [DistributorShipmentsController, LocalShipmentsController, AdminShipmentsController],
  providers: [BatchService, ShipmentsService, ShipmentWorker],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}
