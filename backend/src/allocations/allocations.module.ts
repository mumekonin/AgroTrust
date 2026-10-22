import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { FarmersModule } from '../farmers/farmers.module.js';
import { GeoModule } from '../geo/geo.module.js';
import { SeasonsModule } from '../seasons/seasons.module.js';
import { AdminAllocationsController, MyAllocationsController } from './controller/allocations.controller.js';
import {
  AllocationAdjustment,
  AllocationAdjustmentSchema,
} from './schema/allocation-adjustment.schema.js';
import { AllocationRule, AllocationRuleSchema } from './schema/allocation-rule.schema.js';
import { Allocation, AllocationSchema } from './schema/allocation.schema.js';
import { AllocationsService } from './service/allocations.service.js';

@Module({
  imports: [
    AuditModule,
    FarmersModule,
    SeasonsModule,
    GeoModule,
    CatalogModule,
    MongooseModule.forFeature([
      { name: AllocationRule.name, schema: AllocationRuleSchema },
      { name: Allocation.name, schema: AllocationSchema },
      { name: AllocationAdjustment.name, schema: AllocationAdjustmentSchema },
    ]),
  ],
  controllers: [MyAllocationsController, AdminAllocationsController],
  providers: [AllocationsService],
  exports: [AllocationsService],
})
export class AllocationsModule {}
