import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv } from './env.schema.js';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      cache: true,
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class AppConfigModule {}
