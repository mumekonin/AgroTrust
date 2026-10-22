import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ProblemDetailsFilter } from './errors/problem-details.filter.js';
import { SanitizeInputMiddleware } from './middleware/sanitize-input.middleware.js';

@Module({
  providers: [{ provide: APP_FILTER, useClass: ProblemDetailsFilter }],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SanitizeInputMiddleware).forRoutes('*path');
  }
}