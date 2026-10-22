import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeoModule } from '../geo/geo.module.js';
import { UsersModule } from '../users/users.module.js';
import { LocalCentersController } from './controller/local-centers.controller.js';
import { LocalCenter, LocalCenterSchema } from './schema/local-center.schema.js';
import { LocalCentersService } from './service/local-centers.service.js';

@Module({
  imports: [
    UsersModule,
    GeoModule,
    MongooseModule.forFeature([{ name: LocalCenter.name, schema: LocalCenterSchema }]),
  ],
  controllers: [LocalCentersController],
  providers: [LocalCentersService],
  exports: [LocalCentersService],
})
export class LocalCentersModule {}
