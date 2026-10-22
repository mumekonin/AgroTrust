import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service.js';

@Injectable()
export class NotificationWorker {
  private running = false;

  constructor(private readonly notifications: NotificationsService) {}

  @Interval(30_000)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.notifications.dispatchDue(new Date());
    } catch {
      // The next tick retries. The message body is never logged.
    } finally {
      this.running = false;
    }
  }
}
