var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminGeoController, GeoController } from './controller/geo.controller.js';
import { GeoUnit, GeoUnitSchema } from './schema/geo-unit.schema.js';
import { GeoService } from './service/geo.service.js';
let GeoModule = class GeoModule {
};
GeoModule = __decorate([
    Module({
        imports: [MongooseModule.forFeature([{ name: GeoUnit.name, schema: GeoUnitSchema }])],
        controllers: [GeoController, AdminGeoController],
        providers: [GeoService],
        exports: [GeoService],
    })
], GeoModule);
export { GeoModule };
//# sourceMappingURL=geo.module.js.map