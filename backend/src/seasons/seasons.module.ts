import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSeasonsController, SeasonsController } from './controller/seasons.controller.js';
import { Season, SeasonSchema } from './schema/season.schema.js';
import { SeasonsService } from './service/seasons.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Season.name, schema: SeasonSchema }])],
  controllers: [SeasonsController, AdminSeasonsController],
  providers: [SeasonsService],
  exports: [SeasonsService],
})
export class SeasonsModule {}
