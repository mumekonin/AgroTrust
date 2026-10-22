import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { AuditService } from '../../audit/service/audit.service.js';
import type { InputCategory } from '../../catalog/schema/input.schema.js';
import { CatalogService } from '../../catalog/service/catalog.service.js';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { DistributorsService } from '../../distributors/service/distributors.service.js';
import { FarmerStatus } from '../../farmers/schema/farmer.schema.js';
import { FarmersService } from '../../farmers/service/farmers.service.js';
import { GeoService } from '../../geo/service/geo.service.js';
import { LocalCentersService } from '../../local-centers/service/local-centers.service.js';
import { RequestRequisitionService, type ChunkActor } from '../../requests/service/request-requisition.service.js';
import { SeasonStatus } from '../../seasons/schema/season.schema.js';
import { SeasonsService } from '../../seasons/service/seasons.service.js';
import type { CreateRequisitionDto, ListRequisitionQuery, RespondRequisitionDto } from '../dto/requisitions.dto.js';
import {
  toRequisitionResponse,
  type FarmerEligibility,
  type PreviewResponse,
  type RequisitionDetailResponse,
  type RequisitionListResponse,
  type RequisitionResponse,
} from '../response/requisitions.response.js';
import {
  ProcessingState,
  ProcessingStep,
  Requisition,
  RequisitionCounter,
  RequisitionStatus,
  type RequisitionDocument,
} from '../schema/requisition.schema.js';
import { decisionFor, lineError } from './supply.js';

const DEFAULT_LIMIT = 50;
const DAY_MS = 86_400_000;

@Injectable()
export class RequisitionsService {
  constructor(
    @InjectModel(Requisition.name) private readonly requisitions: Model<Requisition>,
    @InjectModel(RequisitionCounter.name) private readonly counters: Model<RequisitionCounter>,
    @InjectConnection() private readonly connection: Connection,
    private readonly requests: RequestRequisitionService,
    private readonly distributors: DistributorsService,
    private readonly catalog: CatalogService,
    private readonly seasons: SeasonsService,
    private readonly centers: LocalCentersService,
    private readonly farmers: FarmersService,
    private readonly geo: GeoService,
    private readonly audit: AuditService,
  ) {}

  async create(
    principal: Principal,
    input: CreateRequisitionDto,
    idempotencyKey: string,
    userAgent?: string,
  ): Promise<PreviewResponse | RequisitionResponse> {
    this.assertLocalAdmin(principal, input.localCenterId);
    await this.centers.getById(principal, input.localCenterId);
    const assigned = await this.distributors.assignedDistributor(
      input.seasonId,
      input.localCenterId,
      input.inputCategory,
    );
    const bundled = await this.bundle(input.seasonId, input.localCenterId, input.inputCategory);
    if (input.preview) {
      return { distributorId: assigned.distributorId, requestCount: bundled.requestCount, lines: bundled.lines };
    }
    if (bundled.requestCount === 0) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'There are no approved requests to bundle');
    }
    const existing = await this.requisitions
      .findOne({
        localCenterId: objectId(input.localCenterId, 'Invalid center'),
        idempotencyKey,
      })
      .exec();
    if (existing) return toRequisitionResponse(existing);

    const season = await this.seasons.getById(input.seasonId);
    try {
      const saved = await this.transaction(async (session) => {
        const requisitionNo = await this.nextNumber(season.code, session);
        const now = new Date();
        const [doc] = await this.requisitions.create(
          [
            {
              requisitionNo,
              localCenterId: objectId(input.localCenterId, 'Invalid center'),
              distributorId: objectId(assigned.distributorId, 'Invalid distributor'),
              seasonId: objectId(input.seasonId, 'Invalid season'),
              inputCategory: input.inputCategory,
              lines: bundled.lines.map((line) => ({
                inputId: objectId(line.inputId, 'Invalid input'),
                requestedKg: line.requestedKg,
                acceptedKg: 0,
                paidKg: 0,
                shippedKg: 0,
                receivedKg: 0,
              })),
              requestCount: bundled.requestCount,
              status: RequisitionStatus.DRAFT,
              statusHistory: [
                { status: RequisitionStatus.DRAFT, at: now, actorId: objectId(principal.userId, 'Invalid user') },
              ],
              idempotencyKey,
            },
          ],
          { session },
        );
        await this.audit.append({
          ...this.actor(principal, userAgent),
          action: 'REQUISITION_DRAFTED',
          entity: { type: 'requisition', id: String(doc._id) },
          changes: { requisitionNo, requestCount: bundled.requestCount },
          session,
        });
        return doc;
      });
      return toRequisitionResponse(saved);
    } catch (error) {
      if (mongoCode(error) === 11000) {
        const raced = await this.requisitions
          .findOne({ localCenterId: objectId(input.localCenterId, 'Invalid center'), idempotencyKey })
          .exec();
        if (raced) return toRequisitionResponse(raced);
      }
      throw error;
    }
  }

  async submit(principal: Principal, id: string, userAgent?: string): Promise<RequisitionResponse> {
    const requisition = await this.requireRequisition(id);
    this.assertLocalAdmin(principal, String(requisition.localCenterId));
    if (requisition.status === RequisitionStatus.SUBMITTED) return toRequisitionResponse(requisition);
    if (requisition.status !== RequisitionStatus.DRAFT) {
      throw new AppException(ErrorCode.CONFLICT, 'This requisition cannot be submitted', 409);
    }
    const season = await this.seasons.getById(String(requisition.seasonId));
    const now = new Date();
    if (season.status === SeasonStatus.CLOSED || now.getTime() >= new Date(season.requisitionCutoffAt).getTime()) {
      throw new AppException(ErrorCode.SEASON_CLOSED, 'The requisition cutoff has passed', 409);
    }
    const bundled = await this.bundle(
      String(requisition.seasonId),
      String(requisition.localCenterId),
      requisition.inputCategory,
    );
    if (bundled.requestCount === 0) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'There are no approved requests to bundle');
    }
    const saved = await this.transaction(async (session) => {
      const updated = await this.requisitions
        .findOneAndUpdate(
          { _id: requisition._id, status: RequisitionStatus.DRAFT },
          {
            $set: {
              lines: bundled.lines.map((line) => ({
                inputId: objectId(line.inputId, 'Invalid input'),
                requestedKg: line.requestedKg,
                acceptedKg: 0,
                paidKg: 0,
                shippedKg: 0,
                receivedKg: 0,
              })),
              requestCount: bundled.requestCount,
              status: RequisitionStatus.SUBMITTED,
              submittedBy: {
                userId: objectId(principal.userId, 'Invalid user'),
                role: principal.role,
              },
              processing: {
                step: ProcessingStep.MARK,
                processed: 0,
                total: bundled.requestCount,
                status: ProcessingState.RUNNING,
                startedAt: now,
              },
            },
            $push: {
              statusHistory: {
                status: RequisitionStatus.SUBMITTED,
                at: now,
                actorId: objectId(principal.userId, 'Invalid user'),
              },
            },
          },
          { new: true, session },
        )
        .exec();
      if (!updated) throw new AppException(ErrorCode.CONFLICT, 'This requisition cannot be submitted', 409);
      await this.audit.append({
        ...this.actor(principal, userAgent),
        action: 'REQUISITION_SUBMITTED',
        entity: { type: 'requisition', id: String(requisition._id) },
        changes: { requisitionNo: requisition.requisitionNo, requestCount: bundled.requestCount },
        session,
      });
      return updated;
    });
    await this.runChunk(saved);
    const fresh = await this.requireRequisition(String(saved._id));
    return toRequisitionResponse(fresh);
  }

  async listForDistributor(
    principal: Principal,
    query: ListRequisitionQuery,
  ): Promise<RequisitionListResponse> {
    const distributorId = this.assertDistributor(principal);
    const limit = query.limit ?? DEFAULT_LIMIT;
    const filter: Record<string, unknown> = {
      distributorId: objectId(distributorId, 'Invalid distributor'),
    };
    if (query.status) filter.status = query.status;
    if (query.cursor) filter._id = { $gt: objectId(query.cursor, 'Invalid cursor') };
    const docs = await this.requisitions.find(filter).sort({ _id: 1 }).limit(limit + 1).lean().exec();
    const page = docs.slice(0, limit);
    const next = docs.length > limit ? page[page.length - 1] : undefined;
    return {
      items: page.map((doc) => toRequisitionResponse(doc)),
      nextCursor: next ? String(next._id) : undefined,
    };
  }

  async getForDistributor(
    principal: Principal,
    id: string,
    query: { cursor?: string; limit?: number },
  ): Promise<RequisitionDetailResponse> {
    const requisition = await this.requireRequisition(id);
    this.assertCanRead(principal, requisition);
    const linked = await this.requests.pageLinked(String(requisition._id), query);
    const farmers = await this.farmers.lookupMany(linked.items.map((item) => item.farmerId));
    const kebeles = new Map<string, string>();
    for (const kebeleId of new Set([...farmers.values()].map((farmer) => farmer.kebeleId))) {
      const unit = await this.geo.getById(kebeleId);
      kebeles.set(kebeleId, unit.name.en);
    }
    const items: FarmerEligibility[] = linked.items.map((item) => {
      const farmer = farmers.get(item.farmerId);
      return {
        farmerId: item.farmerId,
        fullName: farmer?.fullName ?? '',
        registryId: farmer?.registryId ?? '',
        kebeleId: farmer?.kebeleId ?? '',
        kebeleName: farmer ? kebeles.get(farmer.kebeleId) : undefined,
        requestNo: item.requestNo,
        eligibility: {
          verified: farmer?.status === FarmerStatus.VERIFIED,
          withinQuota: true,
          paid: Boolean(item.paidAt),
        },
        quantities: item.items,
      };
    });
    return { ...toRequisitionResponse(requisition), farmers: { items, nextCursor: linked.nextCursor } };
  }

  async respond(
    principal: Principal,
    id: string,
    input: RespondRequisitionDto,
    userAgent?: string,
  ): Promise<RequisitionResponse> {
    const requisition = await this.requireRequisition(id);
    const distributorId = this.assertDistributor(principal);
    if (String(requisition.distributorId) !== distributorId) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    if (
      requisition.status === RequisitionStatus.ACCEPTED ||
      requisition.status === RequisitionStatus.PARTIALLY_ACCEPTED ||
      requisition.status === RequisitionStatus.DECLINED
    ) {
      return toRequisitionResponse(requisition);
    }
    if (requisition.status !== RequisitionStatus.SUBMITTED || requisition.processing?.status === ProcessingState.RUNNING) {
      throw new AppException(ErrorCode.CONFLICT, 'This requisition is not ready for a response', 409);
    }
    const paired = requisition.lines.map((line) => {
      const response = input.lines.find((item) => item.inputId === String(line.inputId));
      return { requestedKg: line.requestedKg, acceptedKg: response?.acceptedKg ?? -1, inputId: String(line.inputId) };
    });
    if (input.lines.length !== requisition.lines.length || paired.some((line) => line.acceptedKg < 0)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'A response needs one line for each input');
    }
    const invalid = lineError(paired);
    if (invalid) throw new AppException(ErrorCode.VALIDATION_FAILED, invalid);
    const decision = decisionFor(paired);
    if (decision !== 'ACCEPTED' && !input.reason?.trim()) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'A reason is required');
    }
    const now = new Date();
    const saved = await this.transaction(async (session) => {
      const updated = await this.requisitions
        .findOneAndUpdate(
          { _id: requisition._id, status: RequisitionStatus.SUBMITTED, 'processing.status': ProcessingState.DONE },
          {
            $set: {
              status: decision,
              lines: requisition.lines.map((line) => {
                const accepted = paired.find((item) => item.inputId === String(line.inputId));
                return {
                  inputId: line.inputId,
                  requestedKg: line.requestedKg,
                  acceptedKg: accepted?.acceptedKg ?? 0,
                  paidKg: line.paidKg,
                  shippedKg: line.shippedKg,
                  receivedKg: line.receivedKg,
                };
              }),
              respondedBy: objectId(principal.userId, 'Invalid user'),
              respondedAt: now,
              responseReason: input.reason?.trim(),
              processing: {
                step: decision === 'DECLINED' ? ProcessingStep.DECLINE : ProcessingStep.ACCEPT,
                processed: 0,
                total: requisition.requestCount,
                status: ProcessingState.RUNNING,
                startedAt: now,
              },
            },
            $push: {
              statusHistory: {
                status: decision,
                at: now,
                actorId: objectId(principal.userId, 'Invalid user'),
                reason: input.reason?.trim(),
              },
            },
          },
          { new: true, session },
        )
        .exec();
      if (!updated) throw new AppException(ErrorCode.CONFLICT, 'This requisition is not ready for a response', 409);
      await this.audit.append({
        ...this.actor(principal, userAgent),
        action: 'REQUISITION_RESPONDED',
        entity: { type: 'requisition', id: String(requisition._id) },
        changes: { decision, reason: input.reason?.trim() },
        session,
      });
      return updated;
    });
    await this.runChunk(saved);
    return toRequisitionResponse(await this.requireRequisition(String(saved._id)));
  }

  async processDue(now = new Date()): Promise<void> {
    const running = await this.requisitions
      .findOne({ 'processing.status': ProcessingState.RUNNING })
      .sort({ 'processing.startedAt': 1 })
      .exec();
    if (running) await this.runChunk(running);
    const seasonIds = await this.seasons.pastRequisitionCutoff(now);
    await this.requests.expireWaitlist(seasonIds, {
      userId: 'system',
      role: 'system',
      ip: 'worker',
    });
  }

  private async runChunk(requisition: RequisitionDocument): Promise<void> {
    if (requisition.processing?.status !== ProcessingState.RUNNING) return;
    const actor = this.chunkActor(requisition);
    const step = requisition.processing.step;
    let result = { processed: 0, finished: true };
    if (step === ProcessingStep.MARK) {
      const inputIds = await this.catalog.activeIdsForCategory(requisition.inputCategory);
      result = await this.requests.markChunk(
        String(requisition._id),
        String(requisition.localCenterId),
        String(requisition.seasonId),
        inputIds,
        actor,
      );
      if (result.finished) await this.reconcile(requisition);
    } else if (step === ProcessingStep.ACCEPT) {
      const season = await this.seasons.getById(String(requisition.seasonId));
      const due = new Date(Date.now() + season.paymentWindowDays * DAY_MS);
      result = await this.requests.acceptChunk(
        String(requisition._id),
        requisition.lines.map((line) => ({ inputId: String(line.inputId), acceptedKg: line.acceptedKg })),
        season.priorityPolicy,
        due,
        requisition.responseReason,
        actor,
      );
    } else {
      result = await this.requests.declineChunk(
        String(requisition._id),
        requisition.responseReason?.trim() || 'Declined',
        actor,
      );
    }
    const processed = (requisition.processing.processed ?? 0) + result.processed;
    await this.requisitions
      .updateOne(
        { _id: requisition._id, 'processing.status': ProcessingState.RUNNING },
        {
          $set: {
            'processing.processed': processed,
            'processing.status': result.finished ? ProcessingState.DONE : ProcessingState.RUNNING,
          },
        },
      )
      .exec();
  }

  private async reconcile(requisition: RequisitionDocument): Promise<void> {
    const totals = await this.requests.linkedTotals(String(requisition._id));
    const lines = totals.lines.map((line) => ({
      inputId: objectId(line.inputId, 'Invalid input'),
      requestedKg: line.requestedKg,
      acceptedKg: 0,
      paidKg: 0,
      shippedKg: 0,
      receivedKg: 0,
    }));
    await this.requisitions
      .updateOne(
        { _id: requisition._id },
        { $set: { lines, requestCount: totals.requestCount } },
      )
      .exec();
    await this.audit.append({
      actor: this.chunkActor(requisition),
      action: 'REQUISITION_RECONCILED',
      entity: { type: 'requisition', id: String(requisition._id) },
      changes: {
        requestCount: totals.requestCount,
        previousCount: requisition.requestCount,
      },
    });
  }

  private async bundle(seasonId: string, centerId: string, category: InputCategory) {
    const inputIds = await this.catalog.activeIdsForCategory(category);
    return this.requests.bundle(centerId, seasonId, inputIds);
  }

  private assertLocalAdmin(principal: Principal, centerId: string): void {
    if (!principal.roles.includes(Role.LOCAL_ADMIN) || !principal.scope.localCenterIds.includes(centerId)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
  }

  private assertDistributor(principal: Principal): string {
    if (!principal.roles.includes(Role.DISTRIBUTOR_STAFF) || !principal.scope.distributorId) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    return principal.scope.distributorId;
  }

  private assertCanRead(principal: Principal, requisition: RequisitionDocument): void {
    if (principal.roles.includes(Role.NATIONAL_ADMIN) || principal.roles.includes(Role.AUDITOR)) return;
    if (
      principal.roles.includes(Role.DISTRIBUTOR_STAFF) &&
      principal.scope.distributorId === String(requisition.distributorId)
    ) {
      return;
    }
    if (
      principal.roles.includes(Role.LOCAL_ADMIN) &&
      principal.scope.localCenterIds.includes(String(requisition.localCenterId))
    ) {
      return;
    }
    throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
  }

  private chunkActor(requisition: RequisitionDocument): ChunkActor {
    const userId = requisition.respondedBy
      ? String(requisition.respondedBy)
      : requisition.submittedBy
        ? String(requisition.submittedBy.userId)
        : 'system';
    return {
      userId,
      role: requisition.submittedBy?.role ?? 'system',
      ip: 'worker',
    };
  }

  private actor(principal: Principal, userAgent?: string) {
    return {
      actor: { userId: principal.userId, role: principal.role, ip: principal.ip, userAgent },
      requestId: principal.requestId,
    };
  }

  private async nextNumber(seasonCode: string, session: ClientSession): Promise<string> {
    const match = /^(\d{4})/.exec(seasonCode.trim());
    const year = match ? Number(match[1]) : new Date().getUTCFullYear();
    const suffix = String(year % 100).padStart(2, '0');
    const counter = await this.counters
      .findOneAndUpdate({ key: `RN-${suffix}` }, { $inc: { seq: 1 } }, { upsert: true, new: true, session })
      .exec();
    if (!counter) throw new AppException(ErrorCode.INTERNAL_ERROR, 'Could not number the requisition', 500);
    return `RN-${suffix}-${String(counter.seq).padStart(6, '0')}`;
  }

  private async requireRequisition(id: string): Promise<RequisitionDocument> {
    if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
    const doc = await this.requisitions.findById(id).exec();
    if (!doc) throw new AppException(ErrorCode.NOT_FOUND, 'Requisition not found', 404);
    return doc;
  }

  private async transaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.connection.startSession();
    try {
      let value: T | undefined;
      await session.withTransaction(async () => {
        value = await fn(session);
      });
      if (value === undefined) {
        throw new AppException(ErrorCode.INTERNAL_ERROR, 'The transaction did not finish', 500);
      }
      return value;
    } finally {
      await session.endSession();
    }
  }
}

function objectId(id: string, message: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, message);
  return new Types.ObjectId(id);
}

function mongoCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'number') return error.code;
  return undefined;
}
