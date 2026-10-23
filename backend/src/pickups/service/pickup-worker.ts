import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PickupsService } from './pickups.service.js';

@Injectable()
export class PickupWorker {
  private running = false;

  constructor(private readonly pickups: PickupsService) {}

  @Interval(3_600_000)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.pickups.processDue(new Date());
    } catch {
      // The next hour retries. Conditional updates keep expiry idempotent.
    } finally {
      this.running = false;
    }
  }
}
