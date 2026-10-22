import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongo: MongooseHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.mongo.pingCheck('mongodb')]);
  }
}