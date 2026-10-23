import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PaymentsService } from './payments.service.js';

@Injectable()
export class PaymentWorker {
  private running = false;

  constructor(private readonly payments: PaymentsService) {}

  @Interval(3_600_000)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.payments.processDue(new Date());
    } catch {
      // The next hour retries. Conditional updates keep expiry idempotent.
    } finally {
      this.running = false;
    }
  }
}
