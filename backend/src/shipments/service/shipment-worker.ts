import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ShipmentsService } from './shipments.service.js';

@Injectable()
export class ShipmentWorker {
  private running = false;

  constructor(private readonly shipments: ShipmentsService) {}

  @Interval(30_000)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.shipments.processDue();
    } catch {
      // The next tick resumes the same chunk. Conditional updates keep it idempotent.
    } finally {
      this.running = false;
    }
  }
}
