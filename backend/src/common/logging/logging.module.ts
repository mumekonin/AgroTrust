import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { Env } from '../../config/env.schema.js';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          genReqId: (req, res) => {
            const incoming = req.headers['x-request-id'];
            const id =
              typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 100
                ? incoming
                : randomUUID();
            res.setHeader('x-request-id', id);
            return id;
          },
          // Never log secrets (see §2.12)
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.pin',
            'req.body.password',
            'req.body.code',
            'req.body.activationCode',
          ],
          transport:
            config.get('NODE_ENV', { infer: true }) === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),
  ],
})
export class LoggingModule {}