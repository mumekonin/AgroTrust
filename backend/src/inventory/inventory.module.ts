import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocalCentersModule } from '../local-centers/local-centers.module.js';
import { StockController } from './controller/stock.controller.js';
import { Stock, StockMovement, StockMovementSchema, StockSchema } from './schema/stock.schema.js';
import { StockService } from './service/stock.service.js';

@Module({
  imports: [
    LocalCentersModule,
    MongooseModule.forFeature([
      { name: Stock.name, schema: StockSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
    ]),
  ],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class InventoryModule {}
