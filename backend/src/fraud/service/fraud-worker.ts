import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import type { ClientSession, Connection } from 'mongoose';
import { StockService } from '../../inventory/service/stock.service.js';
import { FraudService } from './fraud.service.js';

@Injectable()
export class FraudWorker {
  private running = false;

  constructor(
    private readonly fraud: FraudService,
    private readonly stock: StockService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Cron('45 2 * * *')
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.flagDrift();
    } catch {
      // The next night retries. An open flag is not inserted twice.
    } finally {
      this.running = false;
    }
  }

  private async flagDrift(): Promise<void> {
    for (const row of await this.stock.driftLines()) {
      const identity = { localCenterId: row.localCenterId, inputId: row.inputId, seasonId: row.seasonId };
      if (await this.fraud.hasOpen('ledger_drift', identity)) continue;
      await this.transaction((session) =>
        this.fraud.open(
          {
            type: 'ledger_drift',
            severity: 'high',
            localCenterId: row.localCenterId,
            details: { ...identity, onHandKg: row.onHandKg, ledgerKg: row.ledgerKg },
          },
          session,
        ),
      );
    }
  }

  private async transaction(fn: (session: ClientSession) => Promise<void>): Promise<void> {
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(() => fn(session));
    } finally {
      await session.endSession();
    }
  }
}
