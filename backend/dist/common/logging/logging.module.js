var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
let LoggingModule = class LoggingModule {
};
LoggingModule = __decorate([
    Module({
        imports: [
            LoggerModule.forRootAsync({
                inject: [ConfigService],
                useFactory: (config) => ({
                    pinoHttp: {
                        level: config.get('LOG_LEVEL', { infer: true }),
                        genReqId: (req, res) => {
                            const incoming = req.headers['x-request-id'];
                            const id = typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 100
                                ? incoming
                                : randomUUID();
                            res.setHeader('x-request-id', id);
                            return id;
                        },
                        redact: [
                            'req.headers.authorization',
                            'req.headers.cookie',
                            'req.body.pin',
                            'req.body.password',
                            'req.body.code',
                            'req.body.activationCode',
                        ],
                        transport: config.get('NODE_ENV', { infer: true }) === 'development'
                            ? { target: 'pino-pretty', options: { singleLine: true } }
                            : undefined,
                    },
                }),
            }),
        ],
    })
], LoggingModule);
export { LoggingModule };
//# sourceMappingURL=logging.module.js.map