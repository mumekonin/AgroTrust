import { timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { AllocationsService } from '../../allocations/service/allocations.service.js';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import type { Env } from '../../config/env.schema.js';
import { FarmersService } from '../../farmers/service/farmers.service.js';
import { FraudService } from '../../fraud/service/fraud.service.js';
import { StockService } from '../../inventory/service/stock.service.js';
import { LocalCentersService } from '../../local-centers/service/local-centers.service.js';
import { RequestPickupService, type PickupRequest } from '../../requests/service/request-pickup.service.js';
import type { ChunkActor } from '../../requests/service/request-requisition.service.js';
import { RequestStatus } from '../../requests/schema/input-request.schema.js';
import { SeasonsService } from '../../seasons/service/seasons.service.js';
import { coverRequest, hashPickupCode, newPickupCode } from '../../shipments/service/coverage.js';
import { ShipmentsService } from '../../shipments/service/shipments.service.js';
import type { CompletePickupDto, VerifyPickupDto } from '../dto/pickups.dto.js';
import { OverrideStatus, PickupOverride } from '../schema/pickup-override.schema.js';

const MAX_ATTEMPTS = 5;
const DAY_MS = 86_400_000;

@Injectable()
export class PickupsService {
  private readonly pepper: string;

  constructor(
    @InjectModel(PickupOverride.name) private readonly overrides: Model<PickupOverride>,
    @InjectConnection() private readonly connection: Connection,
    private readonly requests: RequestPickupService,
    private readonly stock: StockService,
    private readonly allocations: AllocationsService,
    private readonly shipments: ShipmentsService,
    private readonly fraud: FraudService,
    private readonly farmers: FarmersService,
    private readonly centers: LocalCentersService,
    private readonly seasons: SeasonsService,
    config: ConfigService<Env, true>,
  ) {
    this.pepper = config.get('AUTH_PEPPER', { infer: true });
  }

  async verify(principal: Principal, input: VerifyPickupDto) {
    const request = await this.requireReady(principal, input.requestNo);
    if (!this.codeMatches(input.code, request.pickupCodeHash)) {
      const recorded = await this.requests.recordFailure(request.id);
      throw new AppException(
        ErrorCode.PICKUP_CODE_INVALID,
        recorded ? 'The pickup code is wrong' : 'Too many attempts',
        400,
      );
    }
    const farmers = await this.farmers.lookupMany([request.farmerId]);
    return {
      requestId: request.id,
      requestNo: request.requestNo,
      fullName: farmers.get(request.farmerId)?.fullName ?? '',
      items: request.items,
    };
  }

  async complete(principal: Principal, requestId: string, input: CompletePickupDto, idempotencyKey: string, userAgent?: string) {
    if (!input.code && !input.reason?.trim()) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Enter the pickup code or a reason');
    }
    const request = await this.requests.findById(requestId);
    if (!request) throw new AppException(ErrorCode.NOT_FOUND, 'Request not found', 404);
    this.assertCenter(principal, request.localCenterId);
    if (request.status === RequestStatus.COMPLETED) {
      return { requestId: request.id, requestNo: request.requestNo, status: request.status };
    }
    const actor = this.actor(principal, userAgent);
    if (!input.code) return this.askOverride(request, input.reason?.trim() ?? '', idempotencyKey, actor);
    await this.assertCode(request, input.code);
    await this.transaction(async (session) => {
      await this.handOver(request, actor, session);
    });
    return { requestId: request.id, requestNo: request.requestNo, status: RequestStatus.COMPLETED };
  }

  async approve(principal: Principal, id: string, userAgent?: string) {
    if (!principal.roles.includes(Role.REGIONAL_ADMIN) && !principal.roles.includes(Role.NATIONAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
    const override = await this.overrides.findById(id).exec();
    if (!override) throw new AppException(ErrorCode.NOT_FOUND, 'Override not found', 404);
    if (override.status === OverrideStatus.APPROVED) {
      return { id: String(override._id), requestNo: override.requestNo, status: override.status };
    }
    const request = await this.requests.findById(String(override.requestId));
    if (!request) throw new AppException(ErrorCode.NOT_FOUND, 'Request not found', 404);
    if (principal.roles.includes(Role.REGIONAL_ADMIN) && !principal.roles.includes(Role.NATIONAL_ADMIN)) {
      const allowed = await this.centers.idsInScope(principal);
      if (!allowed.includes(request.localCenterId)) throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const actor = this.actor(principal, userAgent);
    await this.transaction(async (session) => {
      const updated = await this.overrides
        .updateOne(
          { _id: override._id, status: OverrideStatus.PENDING },
          { $set: { status: OverrideStatus.APPROVED, approvedBy: objectId(principal.userId, 'Invalid user') } },
          { session },
        )
        .exec();
      if (updated.matchedCount !== 1) return;
      await this.handOver(request, actor, session);
    });
    return { id: String(override._id), requestNo: override.requestNo, status: OverrideStatus.APPROVED };
  }

  async processDue(now = new Date()): Promise<void> {
    const actor: ChunkActor = { userId: 'system', role: 'system', ip: 'worker' };
    for (const request of await this.requests.dueForReminder(now)) await this.requests.remind(request);
    const expired = await this.requests.dueForExpiry(now);
    const centers = new Set<string>();
    for (const request of expired) {
      await this.transaction(async (session) => {
        const marked = await this.requests.markExpired(request.id, now, actor, session);
        if (!marked) return;
        for (const item of marked.items) {
          await this.stock.releaseReserve(
            { localCenterId: marked.localCenterId, inputId: item.inputId, seasonId: marked.seasonId, qtyKg: item.qtyKg, requestId: marked.id, actorId: actor.userId },
            session,
          );
          await this.allocations.release(
            { farmerId: marked.farmerId, seasonId: marked.seasonId, inputId: item.inputId, qtyKg: item.qtyKg },
            session,
          );
        }
      });
      centers.add(`${request.localCenterId}:${request.seasonId}`);
    }
    for (const key of centers) {
      const [centerId, seasonId] = key.split(':');
      if (centerId && seasonId) await this.offerWaitlist(centerId, seasonId, actor);
    }
    const seasonIds = await this.seasons.endedIds(now);
    for (const row of await this.stock.unreservedPage(seasonIds)) {
      await this.transaction((session) => this.stock.returnUnreserved(row.id, row.qtyKg, session));
    }
  }

  private async offerWaitlist(centerId: string, seasonId: string, actor: ChunkActor): Promise<void> {
    const rows = (await this.stock.listForCenters([centerId])).filter((row) => row.seasonId === seasonId && row.availableKg > 0);
    let available = new Map(rows.map((row) => [row.inputId, row.availableKg]));
    const waiting = await this.requests.waitlist(centerId, seasonId);
    const season = await this.seasons.getById(seasonId);
    const centerName = await this.centers.readName(centerId);
    const expiresAt = new Date(Date.now() + season.pickupWindowDays * DAY_MS);
    const deadline = expiresAt.toISOString().slice(0, 10);
    for (const request of waiting) {
      const needs = request.items.map((item) => ({ inputId: item.inputId, qtyKg: item.qtyKg }));
      const next = coverRequest(available, needs);
      if (!next) break;
      const code = newPickupCode();
      try {
        await this.transaction(async (session) => {
          for (const item of needs) {
            await this.stock.reserve(
              { localCenterId: centerId, inputId: item.inputId, seasonId, qtyKg: item.qtyKg, requestId: request.id, actorId: actor.userId },
              session,
            );
          }
          const marked = await this.requests.markFromWaitlist(request.id, code, this.pepper, expiresAt, { centerName, deadline }, actor, session);
          if (!marked) throw new AppException(ErrorCode.CONFLICT, 'The waitlisted request could not be earmarked', 409);
        });
      } catch (error) {
        if (!(error instanceof AppException) || error.code !== ErrorCode.CONFLICT) throw error;
        continue;
      }
      available = next;
    }
  }

  private async handOver(request: PickupRequest, actor: ChunkActor, session: ClientSession): Promise<void> {
    const marked = await this.requests.markCompleted(request.id, actor, session);
    if (!marked) throw new AppException(ErrorCode.CONFLICT, 'This request is not ready for pickup', 409);
    for (const item of marked.items) {
      await this.stock.issue(
        { localCenterId: marked.localCenterId, inputId: item.inputId, seasonId: marked.seasonId, qtyKg: item.qtyKg, requestId: marked.id, actorId: actor.userId },
        session,
      );
      await this.allocations.purchase(
        { farmerId: marked.farmerId, seasonId: marked.seasonId, inputId: item.inputId, qtyKg: item.qtyKg },
        session,
      );
    }
    const receiver = await this.shipments.receivedByForRequest(marked.id);
    if (receiver && receiver === actor.userId) {
      await this.fraud.open(
        { type: 'handover_same_person', severity: 'medium', localCenterId: marked.localCenterId, details: { requestNo: marked.requestNo } },
        session,
      );
    }
  }

  private async askOverride(request: PickupRequest, reason: string, idempotencyKey: string, actor: ChunkActor) {
    if (request.status !== RequestStatus.READY_FOR_PICKUP) {
      throw new AppException(ErrorCode.CONFLICT, 'This request is not ready for pickup', 409);
    }
    const existing = await this.overrides.findOne({ idempotencyKey }).exec();
    if (existing) return { id: String(existing._id), requestNo: existing.requestNo, status: existing.status };
    const saved = await this.transaction(async (session) => {
      const [doc] = await this.overrides.create(
        [
          {
            requestId: objectId(request.id, 'Invalid request'),
            requestNo: request.requestNo,
            reason,
            requestedBy: objectId(actor.userId, 'Invalid user'),
            status: OverrideStatus.PENDING,
            idempotencyKey,
          },
        ],
        { session },
      );
      await this.fraud.open(
        { type: 'handover_override', severity: 'high', localCenterId: request.localCenterId, details: { requestNo: request.requestNo, reason } },
        session,
      );
      return doc;
    });
    return { id: String(saved._id), requestNo: saved.requestNo, status: saved.status };
  }

  private async requireReady(principal: Principal, requestNo: string): Promise<PickupRequest> {
    const request = await this.requests.findByNo(requestNo);
    if (!request) throw new AppException(ErrorCode.NOT_FOUND, 'Request not found', 404);
    this.assertCenter(principal, request.localCenterId);
    if (request.status !== RequestStatus.READY_FOR_PICKUP) {
      throw new AppException(ErrorCode.CONFLICT, 'This request is not ready for pickup', 409);
    }
    if (!request.pickupExpiresAt || request.pickupExpiresAt.getTime() <= Date.now()) {
      throw new AppException(ErrorCode.CONFLICT, 'The pickup window has passed', 409);
    }
    if (request.pickupAttempts >= MAX_ATTEMPTS) {
      throw new AppException(ErrorCode.PICKUP_CODE_INVALID, 'Too many attempts', 400);
    }
    return request;
  }

  private async assertCode(request: PickupRequest, code: string): Promise<void> {
    if (request.status !== RequestStatus.READY_FOR_PICKUP) {
      throw new AppException(ErrorCode.CONFLICT, 'This request is not ready for pickup', 409);
    }
    if (!request.pickupExpiresAt || request.pickupExpiresAt.getTime() <= Date.now()) {
      throw new AppException(ErrorCode.CONFLICT, 'The pickup window has passed', 409);
    }
    if (request.pickupAttempts >= MAX_ATTEMPTS) {
      throw new AppException(ErrorCode.PICKUP_CODE_INVALID, 'Too many attempts', 400);
    }
    if (!this.codeMatches(code, request.pickupCodeHash)) {
      const recorded = await this.requests.recordFailure(request.id);
      throw new AppException(ErrorCode.PICKUP_CODE_INVALID, recorded ? 'The pickup code is wrong' : 'Too many attempts', 400);
    }
  }

  private codeMatches(code: string, hash?: string): boolean {
    if (!hash) return false;
    const left = Buffer.from(hashPickupCode(code, this.pepper));
    const right = Buffer.from(hash);
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  }

  private assertCenter(principal: Principal, centerId: string): void {
    if (!principal.roles.includes(Role.LOCAL_ADMIN) || !principal.scope.localCenterIds.includes(centerId)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
  }

  private actor(principal: Principal, userAgent?: string): ChunkActor {
    return { userId: principal.userId, role: principal.role, ip: principal.ip, userAgent, requestId: principal.requestId };
  }

  private async transaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.connection.startSession();
    try {
      return await session.withTransaction(() => fn(session));
    } finally {
      await session.endSession();
    }
  }
}

function objectId(id: string, message: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, message);
  return new Types.ObjectId(id);
}
