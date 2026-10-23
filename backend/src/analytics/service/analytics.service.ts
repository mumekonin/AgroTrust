import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { LocalCentersService } from '../../local-centers/service/local-centers.service.js';
import { RequestMetricsService } from '../../requests/service/request-metrics.service.js';
import { RequisitionsService } from '../../requisitions/service/requisitions.service.js';
import { ShipmentsService } from '../../shipments/service/shipments.service.js';
import { StockService } from '../../inventory/service/stock.service.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import type { AnalyticsQuery } from '../dto/analytics.dto.js';
import { DailySnapshot } from '../schema/daily-snapshot.schema.js';
import {
  isShortage,
  mergeCenters,
  mergeDistributors,
  rollup,
  snapshotScope,
  summarize,
  type SnapshotRow,
  type SnapshotScope,
} from './snapshot.js';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(DailySnapshot.name) private readonly snapshots: Model<DailySnapshot>,
    @InjectConnection() private readonly connection: Connection,
    private readonly requests: RequestMetricsService,
    private readonly shipments: ShipmentsService,
    private readonly requisitions: RequisitionsService,
    private readonly stock: StockService,
    private readonly centers: LocalCentersService,
  ) {}

  async overview(principal: Principal, query: AnalyticsQuery) {
    const page = await this.page(principal, query);
    return { date: page.date, ...summarize(page.items) };
  }

  async shortages(principal: Principal, query: AnalyticsQuery) {
    const scope = snapshotScope(principal);
    const page = await this.page(principal, query, scope.kind === 'all' ? 'center' : undefined);
    return { date: page.date, items: page.items.filter(isShortage).slice(0, 300) };
  }

  async pipeline(principal: Principal, query: AnalyticsQuery) {
    const page = await this.page(principal, query);
    const totals = summarize(page.items);
    return {
      date: page.date,
      requestedKg: totals.requestedKg,
      acceptedKg: totals.acceptedKg,
      paidKg: totals.paidKg,
      dispatchedKg: totals.dispatchedKg,
      receivedKg: totals.receivedKg,
      handedOverKg: totals.handedOverKg,
    };
  }

  async rebuild(now = new Date()): Promise<void> {
    const date = now.toISOString().slice(0, 10);
    const places = new Map((await this.centers.places()).map((place) => [place.id, place]));
    const shipped = await this.shipments.metricLines();
    const centers = mergeCenters(
      [
        ...(await this.requests.lines()),
        ...shipped.map((row) => ({
          localCenterId: row.localCenterId,
          seasonId: row.seasonId,
          inputId: row.inputId,
          dispatchedKg: row.dispatchedKg,
          receivedKg: row.receivedKg,
        })),
        ...(await this.stock.balanceLines()),
      ],
      places,
    );
    const distributors = mergeDistributors([
      ...(await this.requisitions.metricLines()).map((row) => ({ ...row, dispatchedKg: 0, receivedKg: 0 })),
      ...shipped.map((row) => ({
        distributorId: row.distributorId,
        seasonId: row.seasonId,
        inputId: row.inputId,
        requestedKg: 0,
        acceptedKg: 0,
        paidKg: 0,
        dispatchedKg: row.dispatchedKg,
        receivedKg: row.receivedKg,
      })),
    ]);
    const rows = rollup(centers, distributors);
    await this.transaction(async (session) => {
      await this.snapshots.deleteMany({ date }, { session }).exec();
      if (rows.length === 0) return;
      await this.snapshots.insertMany(
        rows.map((row) => ({ ...row, date })),
        { session },
      );
    });
  }

  private async page(
    principal: Principal,
    query: AnalyticsQuery,
    grain?: 'center',
  ): Promise<{ date: string; items: SnapshotRow[] }> {
    const scope = snapshotScope(principal);
    const filter = scopeFilter(scope, grain);
    if (query.seasonId) filter.seasonId = query.seasonId;
    const date = query.date ?? (await this.latest(filter));
    if (!date) return { date: '', items: [] };
    const docs = await this.snapshots.find({ ...filter, date }).lean().exec();
    return {
      date,
      items: docs.map((doc) => ({
        level: doc.level,
        geoId: doc.geoId,
        inputId: doc.inputId,
        seasonId: doc.seasonId,
        requestedKg: doc.requestedKg,
        acceptedKg: doc.acceptedKg,
        paidKg: doc.paidKg,
        dispatchedKg: doc.dispatchedKg,
        receivedKg: doc.receivedKg,
        handedOverKg: doc.handedOverKg,
        onHandKg: doc.onHandKg,
        requestCount: doc.requestCount,
        avgCycleDays: doc.avgCycleDays,
      })),
    };
  }

  private async latest(filter: Record<string, unknown>): Promise<string | undefined> {
    const doc = await this.snapshots.findOne(filter).sort({ date: -1 }).select({ date: 1 }).lean().exec();
    return doc?.date;
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

function scopeFilter(scope: SnapshotScope, grain?: 'center'): Record<string, unknown> {
  if (scope.kind === 'all') return { level: grain ?? 'national' };
  return { level: scope.level, geoId: { $in: scope.geoIds } };
}
