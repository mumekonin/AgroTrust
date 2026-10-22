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
export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [ AppConfigModule,
  LoggingModule,
  DatabaseModule,
  SecurityModule,
  CommonModule,
  HealthModule,
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
