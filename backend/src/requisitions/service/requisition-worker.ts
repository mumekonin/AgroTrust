import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RequisitionsService } from './requisitions.service.js';

@Injectable()
export class RequisitionWorker {
  private running = false;

  constructor(private readonly requisitions: RequisitionsService) {}

  @Interval(30_000)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.requisitions.processDue(new Date());
    } catch {
      // The next tick resumes the same chunk. Conditional updates keep it idempotent.
    } finally {
      this.running = false;
    }
  }
}
