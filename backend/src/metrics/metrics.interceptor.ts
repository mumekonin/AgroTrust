import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { catchError, tap, throwError, type Observable } from 'rxjs';
import { httpRoute, MetricsService } from './metrics.service.js';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const started = process.hrtime.bigint();
    const http = context.switchToHttp();
    const req = http.getRequest<{ method?: string; baseUrl?: string; route?: { path?: string } }>();
    const finish = (status: number) => {
      this.metrics.record(req.method ?? 'GET', httpRoute(req), status, elapsedSeconds(started));
    };
    return next.handle().pipe(
      tap(() => finish(http.getResponse<{ statusCode?: number }>().statusCode ?? 200)),
      catchError((error: unknown) => {
        finish(error instanceof HttpException ? error.getStatus() : 500);
        return throwError(() => error);
      }),
    );
  }
}

function elapsedSeconds(started: bigint): number {
  return Number(process.hrtime.bigint() - started) / 1_000_000_000;
}
