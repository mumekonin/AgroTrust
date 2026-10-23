import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryModule } from '../inventory/inventory.module.js';
import { LocalCentersModule } from '../local-centers/local-centers.module.js';
import { FraudController } from './controller/fraud.controller.js';
import { FraudFlag, FraudFlagSchema } from './schema/fraud-flag.schema.js';
import { FraudService } from './service/fraud.service.js';
import { FraudWorker } from './service/fraud-worker.js';

@Module({
  imports: [
    InventoryModule,
    LocalCentersModule,
    MongooseModule.forFeature([{ name: FraudFlag.name, schema: FraudFlagSchema }]),
  ],
  controllers: [FraudController],
  providers: [FraudService, FraudWorker],
  exports: [FraudService],
})
export class FraudModule {}
