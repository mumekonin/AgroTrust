import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AllocationsModule } from '../allocations/allocations.module.js';
import { FarmersModule } from '../farmers/farmers.module.js';
import { FraudModule } from '../fraud/fraud.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { LocalCentersModule } from '../local-centers/local-centers.module.js';
import { RequestsModule } from '../requests/requests.module.js';
import { SeasonsModule } from '../seasons/seasons.module.js';
import { ShipmentsModule } from '../shipments/shipments.module.js';
import { LocalPickupsController, OverrideController } from './controller/pickups.controller.js';
import { PickupOverride, PickupOverrideSchema } from './schema/pickup-override.schema.js';
import { PickupWorker } from './service/pickup-worker.js';
import { PickupsService } from './service/pickups.service.js';

@Module({
  imports: [
    RequestsModule,
    InventoryModule,
    AllocationsModule,
    ShipmentsModule,
    FraudModule,
    FarmersModule,
    LocalCentersModule,
    SeasonsModule,
    MongooseModule.forFeature([{ name: PickupOverride.name, schema: PickupOverrideSchema }]),
  ],
  controllers: [LocalPickupsController, OverrideController],
  providers: [PickupsService, PickupWorker],
})
export class PickupsModule {}
