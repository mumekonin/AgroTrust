import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AppConfigModule } from './config/app-config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { LoggingModule } from './common/logging/logging.module.js';
import { SecurityModule } from './common/security/security.module.js';
import { CommonModule } from './common/common.module.js';
import { HealthModule } from './health/health.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { GeoModule } from './geo/geo.module.js';
import { SeasonsModule } from './seasons/seasons.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { FarmersModule } from './farmers/farmers.module.js';
import { LocalCentersModule } from './local-centers/local-centers.module.js';
import { DistributorsModule } from './distributors/distributors.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    DatabaseModule,
    SecurityModule,
    CommonModule,
    HealthModule,
    UsersModule,
    AuthModule,
    GeoModule,
    SeasonsModule,
    CatalogModule,
    FarmersModule,
    LocalCentersModule,
    DistributorsModule,
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
