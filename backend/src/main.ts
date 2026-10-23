import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.schema.js';
import { openApiConfig } from './openapi.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const production = config.get('NODE_ENV', { infer: true }) === 'production';
  if (production) {
    const server = app.getHttpAdapter().getInstance() as { set(name: string, value: number): void };
    server.set('trust proxy', 1);
  }

  app.useLogger(app.get(Logger));
  app.use((req: Request, res: Response, next: NextFunction) => {
    const docs = req.path.startsWith('/api/v1/docs');
    helmet({
      contentSecurityPolicy: docs ? false : undefined,
      crossOriginEmbedderPolicy: docs ? false : undefined,
      hsts: production ? undefined : false,
    })(req, res, next);
  });
  app.use(cookieParser());
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready', 'metrics'] });
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, openApiConfig()), {
    useGlobalPrefix: true,
  });
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
