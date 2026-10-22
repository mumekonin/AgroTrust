var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeoModule } from '../geo/geo.module.js';
import { SeasonsModule } from '../seasons/seasons.module.js';
import { AdminCatalogController, CatalogController } from './controller/catalog.controller.js';
import { Input, InputSchema } from './schema/input.schema.js';
import { Price, PriceSchema } from './schema/price.schema.js';
import { CatalogService } from './service/catalog.service.js';
let CatalogModule = class CatalogModule {
};
CatalogModule = __decorate([
    Module({
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
], CatalogModule);
export { CatalogModule };
//# sourceMappingURL=catalog.module.js.map