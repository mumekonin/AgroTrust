import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryModule } from '../inventory/inventory.module.js';
import { LocalCentersModule } from '../local-centers/local-centers.module.js';
import { RequestsModule } from '../requests/requests.module.js';
import { RequisitionsModule } from '../requisitions/requisitions.module.js';
import { ShipmentsModule } from '../shipments/shipments.module.js';
import { AnalyticsController } from './controller/analytics.controller.js';
import { DailySnapshot, DailySnapshotSchema } from './schema/daily-snapshot.schema.js';
import { AnalyticsService } from './service/analytics.service.js';
import { AnalyticsWorker } from './service/analytics-worker.js';

@Module({
  imports: [
    RequestsModule,
    RequisitionsModule,
    ShipmentsModule,
    InventoryModule,
    LocalCentersModule,
    MongooseModule.forFeature([{ name: DailySnapshot.name, schema: DailySnapshotSchema }]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsWorker],
})
export class AnalyticsModule {}
