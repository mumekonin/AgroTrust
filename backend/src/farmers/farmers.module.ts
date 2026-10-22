import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { GeoModule } from '../geo/geo.module.js';
import { UsersModule } from '../users/users.module.js';
import {
  AdminFarmersController,
  FarmerActivationController,
  LocalFarmersController,
} from './controller/farmers.controller.js';
import { FarmerActivation, FarmerActivationSchema } from './schema/farmer-activation.schema.js';
import { Farmer, FarmerSchema } from './schema/farmer.schema.js';
import { FarmersService } from './service/farmers.service.js';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    GeoModule,
    MongooseModule.forFeature([
      { name: Farmer.name, schema: FarmerSchema },
      { name: FarmerActivation.name, schema: FarmerActivationSchema },
    ]),
  ],
  controllers: [LocalFarmersController, AdminFarmersController, FarmerActivationController],
  providers: [FarmersService],
  exports: [FarmersService],
})
export class FarmersModule {}
