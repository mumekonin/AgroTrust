import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeoModule } from '../geo/geo.module.js';
import { LocalCentersModule } from '../local-centers/local-centers.module.js';
import { SeasonsModule } from '../seasons/seasons.module.js';
import {
  DistributorAssignmentsController,
  DistributorsController,
} from './controller/distributors.controller.js';
import {
  DistributorAssignment,
  DistributorAssignmentSchema,
} from './schema/distributor-assignment.schema.js';
import { Distributor, DistributorSchema } from './schema/distributor.schema.js';
import { DistributorsService } from './service/distributors.service.js';

@Module({
  imports: [
    GeoModule,
    SeasonsModule,
    LocalCentersModule,
    MongooseModule.forFeature([
      { name: Distributor.name, schema: DistributorSchema },
      { name: DistributorAssignment.name, schema: DistributorAssignmentSchema },
    ]),
  ],
  controllers: [DistributorsController, DistributorAssignmentsController],
  providers: [DistributorsService],
  exports: [DistributorsService],
})
export class DistributorsModule {}
