import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuditService } from './audit.service.js';

@Injectable()
export class AuditWorker {
  private running = false;

  constructor(private readonly audit: AuditService) {}

  @Cron('30 2 * * *')
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.audit.verifyAndPublish(new Date());
    } catch {
      // The next night retries. A broken chain stays flagged until it verifies.
    } finally {
      this.running = false;
    }
  }
}
