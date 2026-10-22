var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSeasonsController, SeasonsController } from './controller/seasons.controller.js';
import { Season, SeasonSchema } from './schema/season.schema.js';
import { SeasonsService } from './service/seasons.service.js';
let SeasonsModule = class SeasonsModule {
};
SeasonsModule = __decorate([
    Module({
        imports: [MongooseModule.forFeature([{ name: Season.name, schema: SeasonSchema }])],
        controllers: [SeasonsController, AdminSeasonsController],
        providers: [SeasonsService],
        exports: [SeasonsService],
    })
], SeasonsModule);
export { SeasonsModule };
//# sourceMappingURL=seasons.module.js.map