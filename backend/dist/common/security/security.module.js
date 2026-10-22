var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
let SecurityModule = class SecurityModule {
};
SecurityModule = __decorate([
    Module({
        imports: [
            ThrottlerModule.forRootAsync({
                inject: [ConfigService],
                useFactory: (config) => ({
                    throttlers: [
                        {
                            ttl: config.get('THROTTLE_TTL_MS', { infer: true }),
                            limit: config.get('THROTTLE_LIMIT', { infer: true }),
                        },
                    ],
                }),
            }),
        ],
        providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    })
], SecurityModule);
export { SecurityModule };
//# sourceMappingURL=security.module.js.map