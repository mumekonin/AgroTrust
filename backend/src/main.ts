import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule, ObserveInstrument } from './app.module.js';
import type { Env } from './config/env.schema.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    bufferLogs: true,
  });

  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();