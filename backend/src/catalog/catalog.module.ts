import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeoModule } from '../geo/geo.module.js';
import { SeasonsModule } from '../seasons/seasons.module.js';
import { AdminCatalogController, CatalogController } from './controller/catalog.controller.js';
import { Input, InputSchema } from './schema/input.schema.js';
import { Price, PriceSchema } from './schema/price.schema.js';
import { CatalogService } from './service/catalog.service.js';

@Module({
  imports: [
    GeoModule,
    SeasonsModule,
    MongooseModule.forFeature([
      { name: Input.name, schema: InputSchema },
      { name: Price.name, schema: PriceSchema },
    ]),
  ],
  controllers: [CatalogController, AdminCatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
