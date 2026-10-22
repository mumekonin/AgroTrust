import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminGeoController, GeoController } from './controller/geo.controller.js';
import { GeoUnit, GeoUnitSchema } from './schema/geo-unit.schema.js';
import { GeoService } from './service/geo.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: GeoUnit.name, schema: GeoUnitSchema }])],
  controllers: [GeoController, AdminGeoController],
  providers: [GeoService],
  exports: [GeoService],
})
export class GeoModule {}
