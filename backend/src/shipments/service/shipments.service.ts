import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { AuditService } from '../../audit/service/audit.service.js';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { normalizeEthiopianPhone } from '../../common/utils/phone.util.js';
import { FraudService } from '../../fraud/service/fraud.service.js';
import { StockService } from '../../inventory/service/stock.service.js';
import { LocalCentersService } from '../../local-centers/service/local-centers.service.js';
import { RequestShipmentService, type PaidRequest } from '../../requests/service/request-shipment.service.js';
import type { ChunkActor } from '../../requests/service/request-requisition.service.js';
import { RequisitionStatus } from '../../requisitions/schema/requisition.schema.js';
import { RequisitionsService } from '../../requisitions/service/requisitions.service.js';
import { REQUISITION_CHUNK } from '../../requisitions/service/supply.js';
import { SeasonsService } from '../../seasons/service/seasons.service.js';
import type {
  CreateShipmentDto,
  ListShipmentQuery,
  ReceiveShipmentDto,
  ResolveDiscrepancyDto,
  UpdateShipmentDto,
} from '../dto/shipments.dto.js';
import { toShipmentResponse, type ShipmentListResponse, type ShipmentResponse } from '../response/shipments.response.js';
import { ShipmentAllocation } from '../schema/shipment-allocation.schema.js';
import {
  Shipment,
  ShipmentCounter,
  ShipmentProcessingState,
  ShipmentStatus,
  ShipmentStep,
  type ShipmentDocument,
} from '../schema/shipment.schema.js';
import { assertDistributor, BatchService } from './batch.service.js';
import { coverRequest, linesDiffer, newPickupCode, pairsOf, sumBy, type BatchLine } from './coverage.js';

const DEFAULT_LIMIT = 50;
const DAY_MS = 86_400_000;
const KICKS = 5;
const OPEN_STATUSES = new Set<string>([RequisitionStatus.ACCEPTED, RequisitionStatus.PARTIALLY_ACCEPTED]);

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectModel(Shipment.name) private readonly shipments: Model<Shipment>,
    @InjectModel(ShipmentCounter.name) private readonly counters: Model<ShipmentCounter>,
    @InjectModel(ShipmentAllocation.name) private readonly allocations: Model<ShipmentAllocation>,
    @InjectConnection() private readonly connection: Connection,
    private readonly batches: BatchService,
    private readonly requisitions: RequisitionsService,
    private readonly requests: RequestShipmentService,
    private readonly seasons: SeasonsService,
    private readonly centers: LocalCentersService,
    private readonly stock: StockService,
    private readonly fraud: FraudService,
    private readonly audit: AuditService,
  ) {}

  async create(
    principal: Principal,
    input: CreateShipmentDto,
    idempotencyKey: string,
    userAgent?: string,
  ): Promise<ShipmentResponse> {
    const distributorId = assertDistributor(principal);
    const requisition = await this.requisitions.readForDispatch(input.requisitionId);
    if (requisition.distributorId !== distributorId) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    if (!OPEN_STATUSES.has(requisition.status) || !requisition.ready) {
      throw new AppException(ErrorCode.CONFLICT, 'This requisition is not ready to ship', 409);
    }
    const etaAt = new Date(input.etaAt);
    if (Number.isNaN(etaAt.getTime()) || etaAt.getTime() <= Date.now()) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'The arrival time must be in the future');
    }
    const phone = normalizeEthiopianPhone(input.transport.driverPhone);
    if (!phone) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Enter a valid driver phone');
    const lines = input.lines.map((line) => ({ inputId: line.inputId, batchId: line.batchId, qtyKg: line.qtyKg }));
    const existing = await this.shipments
      .findOne({ distributorId: objectId(distributorId, 'Invalid distributor'), idempotencyKey })
      .exec();
    if (existing) return toShipmentResponse(existing);
    const season = await this.seasons.getById(requisition.seasonId);
    const actor = this.actor(principal, userAgent);
    try {
      const saved = await this.transaction(async (session) => {
        await this.batches.claim(distributorId, requisition.seasonId, lines, session);
        await this.requisitions.recordShipped(requisition.id, pairsOf(sumBy(lines, (line) => line.inputId)), session);
        const now = new Date();
        const [doc] = await this.shipments.create(
          [
            {
              shipmentNo: await this.nextNumber(season.code, session),
              requisitionId: objectId(requisition.id, 'Invalid requisition'),
              distributorId: objectId(distributorId, 'Invalid distributor'),
              localCenterId: objectId(requisition.localCenterId, 'Invalid center'),
              seasonId: objectId(requisition.seasonId, 'Invalid season'),
              lines: lines.map(toStoredLine),
              dispatchedAt: now,
              etaAt,
              transport: { vehiclePlate: input.transport.vehiclePlate.trim(), driverName: input.transport.driverName.trim(), driverPhone: phone },
              status: ShipmentStatus.IN_TRANSIT,
              processing: { step: ShipmentStep.ALLOCATE, processed: 0, status: ShipmentProcessingState.RUNNING, startedAt: now },
              idempotencyKey,
            },
          ],
          { session },
        );
        await this.audit.append({
          actor: { userId: actor.userId, role: actor.role, ip: actor.ip, userAgent: actor.userAgent },
          action: 'SHIPMENT_DISPATCHED',
          entity: { type: 'shipment', id: String(doc._id) },
          changes: { shipmentNo: doc.shipmentNo, requisitionId: requisition.id },
          requestId: actor.requestId,
          session,
        });
        return doc;
      });
      await this.kick(saved, actor);
      return toShipmentResponse(await this.requireShipment(String(saved._id)));
    } catch (error) {
      if (mongoCode(error) === 11000) {
        const raced = await this.shipments
          .findOne({ distributorId: objectId(distributorId, 'Invalid distributor'), idempotencyKey })
          .exec();
        if (raced) return toShipmentResponse(raced);
      }
      throw error;
    }
  }

  async update(
    principal: Principal,
    id: string,
    input: UpdateShipmentDto,
    userAgent?: string,
  ): Promise<ShipmentResponse> {
    const distributorId = assertDistributor(principal);
    const shipment = await this.requireShipment(id);
    if (String(shipment.distributorId) !== distributorId) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    if (shipment.status !== ShipmentStatus.IN_TRANSIT) {
      throw new AppException(ErrorCode.CONFLICT, 'This shipment can no longer be changed', 409);
    }
    if (!input.etaAt && !input.transport) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Nothing to update');
    const patch: Record<string, unknown> = {};
    if (input.etaAt) {
      const etaAt = new Date(input.etaAt);
      if (Number.isNaN(etaAt.getTime()) || etaAt.getTime() <= Date.now()) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'The arrival time must be in the future');
      }
      patch.etaAt = etaAt;
    }
    if (input.transport) {
      const phone = normalizeEthiopianPhone(input.transport.driverPhone);
      if (!phone) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Enter a valid driver phone');
      patch.transport = {
        vehiclePlate: input.transport.vehiclePlate.trim(),
        driverName: input.transport.driverName.trim(),
        driverPhone: phone,
      };
    }
    const updated = await this.shipments
      .findOneAndUpdate({ _id: shipment._id, status: ShipmentStatus.IN_TRANSIT }, { $set: patch }, { new: true })
      .exec();
    if (!updated) throw new AppException(ErrorCode.CONFLICT, 'This shipment can no longer be changed', 409);
    await this.audit.append({
      actor: { userId: principal.userId, role: principal.role, ip: principal.ip, userAgent },
      action: 'SHIPMENT_UPDATED',
      entity: { type: 'shipment', id: String(shipment._id) },
      changes: { shipmentNo: shipment.shipmentNo, etaAt: input.etaAt },
      requestId: principal.requestId,
    });
    return toShipmentResponse(updated);
  }

  async listIncoming(principal: Principal, query: ListShipmentQuery): Promise<ShipmentListResponse> {
    if (!principal.roles.includes(Role.LOCAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const centerIds = (await this.centers.idsInScope(principal)).filter((id) => principal.scope.localCenterIds.includes(id));
    return this.page(centerIds, query);
  }

  async receive(
    principal: Principal,
    id: string,
    input: ReceiveShipmentDto,
    userAgent?: string,
  ): Promise<ShipmentResponse> {
    this.assertCenterAdmin(principal);
    const shipment = await this.requireShipment(id);
    if (!principal.scope.localCenterIds.includes(String(shipment.localCenterId))) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    if (shipment.status === ShipmentStatus.RECEIVED || shipment.status === ShipmentStatus.RECEIVED_WITH_DISCREPANCY) {
      return toShipmentResponse(shipment);
    }
    if (shipment.status !== ShipmentStatus.IN_TRANSIT || shipment.processing?.status === ShipmentProcessingState.RUNNING) {
      throw new AppException(ErrorCode.CONFLICT, 'This shipment is not ready to receive', 409);
    }
    const received = input.lines.map((line) => ({ inputId: line.inputId, batchId: line.batchId, qtyKg: line.qtyKg }));
    const dispatched = shipment.lines.map((line) => ({
      inputId: String(line.inputId),
      batchId: String(line.batchId),
      qtyKg: line.qtyKg,
    }));
    const differs = linesDiffer(dispatched, received);
    const status = differs ? ShipmentStatus.RECEIVED_WITH_DISCREPANCY : ShipmentStatus.RECEIVED;
    const actor = this.actor(principal, userAgent);
    const saved = await this.transaction(async (session) => {
      const now = new Date();
      const updated = await this.shipments
        .findOneAndUpdate(
          { _id: shipment._id, status: ShipmentStatus.IN_TRANSIT, 'processing.status': ShipmentProcessingState.DONE },
          {
            $set: {
              status,
              receivedBy: objectId(principal.userId, 'Invalid user'),
              receivedAt: now,
              receivedLines: received.map(toStoredLine),
              discrepancy: differs ? { note: input.note?.trim() } : undefined,
              processing: { step: ShipmentStep.EARMARK, processed: 0, status: ShipmentProcessingState.RUNNING, startedAt: now },
            },
          },
          { new: true, session },
        )
        .exec();
      if (!updated) throw new AppException(ErrorCode.CONFLICT, 'This shipment is not ready to receive', 409);
      await this.requisitions.recordReceived(
        String(shipment.requisitionId),
        pairsOf(sumBy(received, (line) => line.inputId)),
        session,
      );
      for (const line of received) {
        await this.stock.receive(
          {
            localCenterId: String(shipment.localCenterId),
            inputId: line.inputId,
            seasonId: String(shipment.seasonId),
            qtyKg: line.qtyKg,
            batchId: line.batchId,
            shipmentId: String(shipment._id),
            actorId: principal.userId,
            note: input.note?.trim(),
          },
          session,
        );
      }
      if (differs) {
        await this.fraud.open(
          {
            type: 'receipt_discrepancy',
            severity: 'high',
            localCenterId: String(shipment.localCenterId),
            distributorId: String(shipment.distributorId),
            shipmentId: String(shipment._id),
            details: { note: input.note?.trim() ?? '', shipmentNo: shipment.shipmentNo },
          },
          session,
        );
      }
      await this.audit.append({
        actor: { userId: actor.userId, role: actor.role, ip: actor.ip, userAgent: actor.userAgent },
        action: 'SHIPMENT_RECEIVED',
        entity: { type: 'shipment', id: String(shipment._id) },
        changes: { shipmentNo: shipment.shipmentNo, status, discrepancy: differs },
        requestId: actor.requestId,
        session,
      });
      return updated;
    });
    await this.kick(saved, actor);
    return toShipmentResponse(await this.requireShipment(String(saved._id)));
  }

  async resolve(
    principal: Principal,
    id: string,
    input: ResolveDiscrepancyDto,
    userAgent?: string,
  ): Promise<ShipmentResponse> {
    if (!principal.roles.includes(Role.REGIONAL_ADMIN) && !principal.roles.includes(Role.NATIONAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const shipment = await this.requireShipment(id);
    if (principal.roles.includes(Role.REGIONAL_ADMIN) && !principal.roles.includes(Role.NATIONAL_ADMIN)) {
      const allowed = await this.centers.idsInScope(principal);
      if (!allowed.includes(String(shipment.localCenterId))) {
        throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
      }
    }
    if (shipment.discrepancy?.resolution) return toShipmentResponse(shipment);
    if (shipment.status !== ShipmentStatus.RECEIVED_WITH_DISCREPANCY) {
      throw new AppException(ErrorCode.CONFLICT, 'This shipment has no discrepancy', 409);
    }
    const updated = await this.shipments
      .findOneAndUpdate(
        { _id: shipment._id, status: ShipmentStatus.RECEIVED_WITH_DISCREPANCY, 'discrepancy.resolution': { $exists: false } },
        {
          $set: {
            'discrepancy.resolvedBy': objectId(principal.userId, 'Invalid user'),
            'discrepancy.resolution': input.resolution.trim(),
          },
        },
        { new: true },
      )
      .exec();
    if (!updated) return toShipmentResponse(await this.requireShipment(id));
    await this.audit.append({
      actor: { userId: principal.userId, role: principal.role, ip: principal.ip, userAgent },
      action: 'SHIPMENT_DISCREPANCY_RESOLVED',
      entity: { type: 'shipment', id: String(shipment._id) },
      changes: { shipmentNo: shipment.shipmentNo, resolution: input.resolution.trim() },
      requestId: principal.requestId,
    });
    return toShipmentResponse(updated);
  }

  async receivedByForRequest(requestId: string): Promise<string | undefined> {
    if (!Types.ObjectId.isValid(requestId)) return undefined;
    const allocation = await this.allocations
      .findOne({ requestId: objectId(requestId, 'Invalid request') })
      .select({ shipmentId: 1 })
      .lean()
      .exec();
    if (!allocation) return undefined;
    const shipment = await this.shipments.findById(allocation.shipmentId).select({ receivedBy: 1 }).lean().exec();
    return shipment?.receivedBy ? String(shipment.receivedBy) : undefined;
  }

  async processDue(): Promise<void> {
    const running = await this.shipments
      .findOne({ 'processing.status': ShipmentProcessingState.RUNNING })
      .sort({ 'processing.startedAt': 1 })
      .exec();
    if (!running) return;
    await this.runChunk(running, { userId: 'system', role: 'system', ip: 'worker' });
  }

  private async kick(shipment: ShipmentDocument, actor: ChunkActor): Promise<void> {
    let current: ShipmentDocument | null = shipment;
    for (let attempt = 0; attempt < KICKS && current?.processing?.status === ShipmentProcessingState.RUNNING; attempt += 1) {
      await this.runChunk(current, actor);
      current = await this.shipments.findById(current._id).exec();
    }
  }

  private async runChunk(shipment: ShipmentDocument, actor: ChunkActor): Promise<void> {
    if (shipment.processing?.status !== ShipmentProcessingState.RUNNING) return;
    const step = shipment.processing.step;
    let finished = true;
    let processed = 0;
    if (step === ShipmentStep.ALLOCATE) {
      const result = await this.allocateChunk(shipment, actor);
      finished = result.finished;
      processed = result.processed;
      if (finished) {
        await this.shipments.updateOne(
          { _id: shipment._id, 'processing.step': ShipmentStep.ALLOCATE },
          { $set: { 'processing.step': ShipmentStep.TRANSIT, 'processing.processed': 0, 'processing.status': ShipmentProcessingState.RUNNING } },
        );
        return;
      }
    } else if (step === ShipmentStep.TRANSIT) {
      const result = await this.transitChunk(shipment, actor);
      finished = result.finished;
      processed = result.processed;
    } else {
      const result = await this.earmarkChunk(shipment, actor);
      finished = result.finished;
      processed = result.processed;
    }
    await this.shipments.updateOne(
      { _id: shipment._id, 'processing.status': ShipmentProcessingState.RUNNING },
      {
        $set: {
          'processing.processed': (shipment.processing.processed ?? 0) + processed,
          'processing.status': finished ? ShipmentProcessingState.DONE : ShipmentProcessingState.RUNNING,
        },
      },
    );
  }

  private async allocateChunk(shipment: ShipmentDocument, actor: ChunkActor): Promise<{ processed: number; finished: boolean }> {
    const season = await this.seasons.getById(String(shipment.seasonId));
    const centerName = await this.centers.readName(String(shipment.localCenterId));
    const takenIds = await this.allocatedRequestIds(String(shipment._id));
    const page = await this.requests.nextPaid(String(shipment.requisitionId), season.priorityPolicy, [...takenIds]);
    if (page.length === 0) return { processed: 0, finished: true };
    const remaining = await this.unallocated(shipment);
    const chosen: PaidRequest[] = [];
    for (const request of page) {
      const next = coverRequest(remaining, request.items);
      if (!next) break;
      chosen.push(request);
      for (const [inputId, qty] of next) remaining.set(inputId, qty);
    }
    if (chosen.length === 0) return { processed: 0, finished: true };
    const eta = shipment.etaAt.toISOString().slice(0, 10);
    await this.transaction(async (session) => {
      for (const request of chosen) {
        const marked = await this.requests.markInTransit(request.id, { centerName, eta }, actor, session);
        if (!marked) continue;
        if (request.items.length === 0) continue;
        await this.allocations.insertMany(
          request.items.map((item) => ({
            shipmentId: shipment._id,
            requestId: objectId(request.id, 'Invalid request'),
            inputId: objectId(item.inputId, 'Invalid input'),
            qtyKg: item.qtyKg,
          })),
          { session },
        );
      }
    });
    return { processed: chosen.length, finished: chosen.length < page.length || page.length < REQUISITION_CHUNK };
  }

  private async transitChunk(shipment: ShipmentDocument, actor: ChunkActor): Promise<{ processed: number; finished: boolean }> {
    const ids = [...(await this.allocatedRequestIds(String(shipment._id)))];
    const statuses = await this.requests.statuses(ids);
    const pending = ids.filter((id) => statuses.get(id) === 'PAID').slice(0, REQUISITION_CHUNK);
    if (pending.length === 0) return { processed: 0, finished: true };
    const centerName = await this.centers.readName(String(shipment.localCenterId));
    const eta = shipment.etaAt.toISOString().slice(0, 10);
    await this.transaction(async (session) => {
      for (const requestId of pending) {
        await this.requests.markInTransit(requestId, { centerName, eta }, actor, session);
      }
    });
    return { processed: pending.length, finished: pending.length < REQUISITION_CHUNK };
  }

  private async earmarkChunk(shipment: ShipmentDocument, actor: ChunkActor): Promise<{ processed: number; finished: boolean }> {
    const rows = await this.allocations.find({ shipmentId: shipment._id }).sort({ _id: 1 }).lean().exec();
    const grouped = new Map<string, BatchLine[]>();
    const order: string[] = [];
    for (const row of rows) {
      const requestId = String(row.requestId);
      if (!grouped.has(requestId)) {
        grouped.set(requestId, []);
        order.push(requestId);
      }
      grouped.get(requestId)?.push({ inputId: String(row.inputId), batchId: '', qtyKg: row.qtyKg });
    }
    const statuses = await this.requests.statuses(order);
    const received = sumBy(
      shipment.receivedLines.map((line) => ({ inputId: String(line.inputId), qtyKg: line.qtyKg })),
      (line) => line.inputId,
    );
    for (const requestId of order) {
      if (statuses.get(requestId) !== 'READY_FOR_PICKUP') continue;
      const next = coverRequest(received, grouped.get(requestId) ?? []);
      if (next) for (const [inputId, qty] of next) received.set(inputId, qty);
    }
    const waiting = order.filter((id) => statuses.get(id) === 'IN_TRANSIT');
    const season = await this.seasons.getById(String(shipment.seasonId));
    const centerName = await this.centers.readName(String(shipment.localCenterId));
    const expiresAt = new Date(Date.now() + season.pickupWindowDays * DAY_MS);
    const deadline = expiresAt.toISOString().slice(0, 10);
    let processed = 0;
    for (const requestId of waiting.slice(0, REQUISITION_CHUNK)) {
      const needs = grouped.get(requestId) ?? [];
      const next = coverRequest(received, needs);
      if (!next) return { processed, finished: true };
      const code = newPickupCode();
      const reserved = await this.transaction(async (session) => {
        for (const line of needs) {
          await this.stock.reserve(
            {
              localCenterId: String(shipment.localCenterId),
              inputId: line.inputId,
              seasonId: String(shipment.seasonId),
              qtyKg: line.qtyKg,
              shipmentId: String(shipment._id),
              requestId,
              actorId: actor.userId,
            },
            session,
          );
        }
        return this.requests.markReady(requestId, code, expiresAt, { centerName, deadline }, actor, session);
      });
      if (!reserved) throw new AppException(ErrorCode.CONFLICT, 'This request could not be earmarked', 409);
      for (const [inputId, qty] of next) received.set(inputId, qty);
      processed += 1;
    }
    return { processed, finished: waiting.length <= REQUISITION_CHUNK };
  }

  private async unallocated(shipment: ShipmentDocument): Promise<Map<string, number>> {
    const rows = await this.allocations.find({ shipmentId: shipment._id }).select({ inputId: 1, qtyKg: 1 }).lean().exec();
    const used = sumBy(
      rows.map((row) => ({ inputId: String(row.inputId), qtyKg: row.qtyKg })),
      (line) => line.inputId,
    );
    const remaining = sumBy(
      shipment.lines.map((line) => ({ inputId: String(line.inputId), qtyKg: line.qtyKg })),
      (line) => line.inputId,
    );
    for (const [inputId, qty] of used) remaining.set(inputId, (remaining.get(inputId) ?? 0) - qty);
    return remaining;
  }

  private async allocatedRequestIds(shipmentId: string): Promise<Set<string>> {
    const rows = await this.allocations.find({ shipmentId: objectId(shipmentId, 'Invalid shipment') }).select({ requestId: 1 }).lean().exec();
    return new Set(rows.map((row) => String(row.requestId)));
  }

  private async page(centerIds: string[], query: ListShipmentQuery): Promise<ShipmentListResponse> {
    if (centerIds.length === 0) return { items: [] };
    const limit = query.limit ?? DEFAULT_LIMIT;
    const filter: Record<string, unknown> = {
      localCenterId: { $in: centerIds.map((id) => objectId(id, 'Invalid center')) },
    };
    if (query.status) filter.status = query.status;
    if (query.cursor) filter._id = { $gt: objectId(query.cursor, 'Invalid cursor') };
    const docs = await this.shipments.find(filter).sort({ _id: 1 }).limit(limit + 1).lean().exec();
    const pageDocs = docs.slice(0, limit);
    const next = docs.length > limit ? pageDocs[pageDocs.length - 1] : undefined;
    return {
      items: pageDocs.map((doc) => toShipmentResponse(doc)),
      nextCursor: next ? String(next._id) : undefined,
    };
  }

  private assertCenterAdmin(principal: Principal): void {
    if (!principal.roles.includes(Role.LOCAL_ADMIN) || principal.scope.localCenterIds.length === 0) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
  }

  private actor(principal: Principal, userAgent?: string): ChunkActor {
    return {
      userId: principal.userId,
      role: principal.role,
      ip: principal.ip,
      userAgent,
      requestId: principal.requestId,
    };
  }

  private async nextNumber(seasonCode: string, session: ClientSession): Promise<string> {
    const match = /^(\d{4})/.exec(seasonCode.trim());
    const year = match ? Number(match[1]) : new Date().getUTCFullYear();
    const suffix = String(year % 100).padStart(2, '0');
    const counter = await this.counters
      .findOneAndUpdate({ key: `SH-${suffix}` }, { $inc: { seq: 1 } }, { upsert: true, new: true, session })
      .exec();
    if (!counter) throw new AppException(ErrorCode.INTERNAL_ERROR, 'Could not number the shipment', 500);
    return `SH-${suffix}-${String(counter.seq).padStart(6, '0')}`;
  }

  private async requireShipment(id: string): Promise<ShipmentDocument> {
    if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
    const doc = await this.shipments.findById(id).exec();
    if (!doc) throw new AppException(ErrorCode.NOT_FOUND, 'Shipment not found', 404);
    return doc;
  }

  private async transaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.connection.startSession();
    try {
      let value: T | undefined;
      await session.withTransaction(async () => {
        value = await fn(session);
      });
      if (value === undefined) throw new AppException(ErrorCode.INTERNAL_ERROR, 'The transaction did not finish', 500);
      return value;
    } finally {
      await session.endSession();
    }
  }
}

function toStoredLine(line: BatchLine): { inputId: Types.ObjectId; batchId: Types.ObjectId; qtyKg: number } {
  return {
    inputId: objectId(line.inputId, 'Invalid input'),
    batchId: objectId(line.batchId, 'Invalid batch'),
    qtyKg: line.qtyKg,
  };
}

function objectId(id: string, message: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, message);
  return new Types.ObjectId(id);
}

function mongoCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'number') return error.code;
  return undefined;
}
