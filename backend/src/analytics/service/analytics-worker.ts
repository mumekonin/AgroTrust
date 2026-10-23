import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service.js';

@Injectable()
export class AnalyticsWorker {
  private running = false;

  constructor(private readonly analytics: AnalyticsService) {}

  @Cron('0 2 * * *')
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.analytics.rebuild(new Date());
    } catch {
      // The next night rebuilds the same date. The unique key keeps one row per grain.
    } finally {
      this.running = false;
    }
  }
}
