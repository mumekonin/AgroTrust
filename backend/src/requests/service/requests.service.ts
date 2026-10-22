import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { AllocationsService } from '../../allocations/service/allocations.service.js';
import { AuditService } from '../../audit/service/audit.service.js';
import { OtpPurpose } from '../../auth/schema/otp-challenge.schema.js';
import { OtpService } from '../../auth/service/otp.service.js';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { CatalogService } from '../../catalog/service/catalog.service.js';
import { FarmerStatus } from '../../farmers/schema/farmer.schema.js';
import { FarmersService, type FarmerRecord } from '../../farmers/service/farmers.service.js';
import { LocalCentersService } from '../../local-centers/service/local-centers.service.js';
import {
  NotificationEvent,
  type NotificationLanguage,
} from '../../notifications/schema/notification.schema.js';
import { NotificationsService } from '../../notifications/service/notifications.service.js';
import { SeasonsService } from '../../seasons/service/seasons.service.js';
import { UserStatus } from '../../users/schema/user.schema.js';
import { UsersService } from '../../users/service/users.service.js';
import type {
  AssistedRequestDto,
  ConfirmAssistedRequestDto,
  CreateRequestDto,
  ListRequestQuery,
} from '../dto/requests.dto.js';
import {
  toRequestResponse,
  type AssistedChallengeResponse,
  type RequestListResponse,
  type RequestResponse,
} from '../response/requests.response.js';
import {
  ConsentMethod,
  InputRequest,
  RequestChannel,
  RequestCounter,
  RequestStatus,
  type InputRequestDocument,
} from '../schema/input-request.schema.js';
import { canCancelRequest, canReviewRequest, canSeeRequest } from './request-access.js';
import {
  duplicateInputId,
  formatRequestNo,
  lineAmountError,
  lineAmounts,
  requestPayloadHash,
  requestYearSuffix,
  sameHash,
  seasonClosedReason,
} from './request-items.js';

const DEFAULT_LIMIT = 50;

interface PricedLine {
  inputId: string;
  qtyKg: number;
  unitPriceSantimPerKg: number;
  subsidySantimPerKg: number;
  lineTotalSantim: number;
}

interface PreparedRequest {
  seasonCode: string;
  lines: PricedLine[];
  totalSantim: number;
  subsidySantim: number;
  payableSantim: number;
}

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(InputRequest.name) private readonly requests: Model<InputRequest>,
    @InjectModel(RequestCounter.name) private readonly counters: Model<RequestCounter>,
    @InjectConnection() private readonly connection: Connection,
    private readonly allocations: AllocationsService,
    private readonly farmers: FarmersService,
    private readonly seasons: SeasonsService,
    private readonly catalog: CatalogService,
    private readonly centers: LocalCentersService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly otp: OtpService,
    private readonly audit: AuditService,
  ) {}

  async submit(
    principal: Principal,
    input: CreateRequestDto,
    idempotencyKey: string,
    userAgent?: string,
  ): Promise<RequestResponse> {
    if (!principal.roles.includes(Role.FARMER)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const farmer = await this.farmers.findOwn(principal.userId);
    if (!farmer) throw new AppException(ErrorCode.NOT_FOUND, 'Farmer not found', 404);
    const existing = await this.findByKey(farmer.id, idempotencyKey);
    if (existing) return toRequestResponse(existing);
    await this.requireActiveAccount(farmer);
    const prepared = await this.prepare(farmer, input.seasonId, input.items);
    const now = new Date();
    return this.insertSubmitted({
      principal,
      userAgent,
      farmer,
      seasonId: input.seasonId,
      prepared,
      idempotencyKey,
      channel: RequestChannel.SELF,
      consent: { method: ConsentMethod.APP, confirmedAt: now },
      language: await this.languageFor(farmer),
    });
  }

  /** Sends a payload-bound OTP. The code is only in the SMS, never in this response. */
  async startAssisted(
    principal: Principal,
    input: AssistedRequestDto,
  ): Promise<AssistedChallengeResponse> {
    const farmer = await this.readableFarmer(input.farmerId);
    if (!canReviewRequest(principal, farmer)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    if (!farmer.phone) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'This farmer has no phone for a confirmation code');
    }
    await this.prepare(farmer, input.seasonId, input.items);
    const issued = await this.otp.issue({
      userId: farmer.userId,
      phone: farmer.phone,
      purpose: OtpPurpose.ASSISTED_REQUEST,
      payloadHash: requestPayloadHash({
        farmerId: farmer.id,
        seasonId: input.seasonId,
        items: input.items,
      }),
    });
    await this.notifications.enqueue({
      farmerId: farmer.id,
      userId: farmer.userId,
      phone: farmer.phone,
      event: NotificationEvent.ASSISTED_REQUEST_OTP,
      language: await this.languageFor(farmer),
      params: { code: issued.code },
      related: { type: 'otp_challenge', id: issued.id },
    });
    return { id: issued.id };
  }

  async confirmAssisted(
    principal: Principal,
    challengeId: string,
    input: ConfirmAssistedRequestDto,
    idempotencyKey: string,
    userAgent?: string,
  ): Promise<RequestResponse> {
    const farmer = await this.readableFarmer(input.farmerId);
    if (!canReviewRequest(principal, farmer)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const existing = await this.findByKey(farmer.id, idempotencyKey);
    if (existing) return toRequestResponse(existing);

    const verified = await this.otp.verify(challengeId, input.code, OtpPurpose.ASSISTED_REQUEST);
    const hash = requestPayloadHash({
      farmerId: farmer.id,
      seasonId: input.seasonId,
      items: input.items,
    });
    if (!sameHash(hash, verified.payloadHash)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'The confirmation does not match this request');
    }
    const prepared = await this.prepare(farmer, input.seasonId, input.items);
    return this.insertSubmitted({
      principal,
      userAgent,
      farmer,
      seasonId: input.seasonId,
      prepared,
      idempotencyKey,
      channel: RequestChannel.ASSISTED,
      consent: {
        method: ConsentMethod.SMS_OTP,
        otpChallengeId: objectId(challengeId, 'Invalid id'),
        confirmedAt: new Date(),
      },
      language: await this.languageFor(farmer),
    });
  }

  async listMine(principal: Principal, query: ListRequestQuery): Promise<RequestListResponse> {
    if (!principal.roles.includes(Role.FARMER)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const farmer = await this.farmers.findOwn(principal.userId);
    if (!farmer) return { items: [] };
    return this.page({ farmerId: objectId(farmer.id, 'Invalid farmer') }, query);
  }

  async listQueue(principal: Principal, query: ListRequestQuery): Promise<RequestListResponse> {
    if (!principal.roles.includes(Role.LOCAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const filter: Record<string, unknown> = {
      localCenterId: { $in: principal.scope.localCenterIds.map((id) => objectId(id, 'Invalid center')) },
    };
    if (query.status) filter.status = query.status;
    return this.page(filter, query);
  }

  async getById(principal: Principal, id: string): Promise<RequestResponse> {
    const request = await this.requireRequest(id);
    const farmer = await this.farmers.readRecord(String(request.farmerId));
    if (!canSeeRequest(principal, farmer)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    return toRequestResponse(request);
  }

  async approve(principal: Principal, id: string, userAgent?: string): Promise<RequestResponse> {
    return this.review(principal, id, RequestStatus.APPROVED, undefined, userAgent);
  }

  async reject(principal: Principal, id: string, reason: string, userAgent?: string): Promise<RequestResponse> {
    const trimmed = reason.trim();
    if (!trimmed) throw new AppException(ErrorCode.VALIDATION_FAILED, 'A reason is required');
    return this.review(principal, id, RequestStatus.REJECTED, trimmed, userAgent);
  }

  async cancel(principal: Principal, id: string, userAgent?: string): Promise<RequestResponse> {
    const request = await this.requireRequest(id);
    const farmer = await this.farmers.readRecord(String(request.farmerId));
    if (!canCancelRequest(principal, farmer)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    if (request.status === RequestStatus.CANCELLED) return toRequestResponse(request);
    if (request.status !== RequestStatus.SUBMITTED && request.status !== RequestStatus.APPROVED) {
      throw new AppException(ErrorCode.CONFLICT, 'This request cannot be cancelled', 409);
    }
    const saved = await this.transaction(async (session) => {
      await this.releaseItems(request, session);
      const now = new Date();
      const updated = await this.requests
        .findOneAndUpdate(
          { _id: request._id, status: { $in: [RequestStatus.SUBMITTED, RequestStatus.APPROVED] } },
          {
            $set: { status: RequestStatus.CANCELLED },
            $push: {
              statusHistory: {
                status: RequestStatus.CANCELLED,
                at: now,
                actorId: objectId(principal.userId, 'Invalid user'),
              },
            },
          },
          { new: true, session },
        )
        .exec();
      if (!updated) {
        throw new AppException(ErrorCode.CONFLICT, 'This request cannot be cancelled', 409);
      }
      await this.audit.append({
        ...actor(principal, userAgent),
        action: 'REQUEST_CANCELLED',
        entity: { type: 'input_request', id: String(request._id) },
        changes: { requestNo: request.requestNo },
        session,
      });
      return updated;
    });
    return toRequestResponse(saved);
  }

  private async review(
    principal: Principal,
    id: string,
    status: typeof RequestStatus.APPROVED | typeof RequestStatus.REJECTED,
    reason: string | undefined,
    userAgent?: string,
  ): Promise<RequestResponse> {
    const request = await this.requireRequest(id);
    const farmer = await this.farmers.readRecord(String(request.farmerId));
    if (!canReviewRequest(principal, farmer)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    if (request.status === status) return toRequestResponse(request);
    if (request.status !== RequestStatus.SUBMITTED) {
      throw new AppException(ErrorCode.CONFLICT, 'This request is not awaiting review', 409);
    }
    const event =
      status === RequestStatus.APPROVED
        ? NotificationEvent.REQUEST_APPROVED
        : NotificationEvent.REQUEST_REJECTED;
    const language = await this.languageFor(farmer);
    const saved = await this.transaction(async (session) => {
      if (status === RequestStatus.REJECTED) await this.releaseItems(request, session);
      const now = new Date();
      const updated = await this.requests
        .findOneAndUpdate(
          { _id: request._id, status: RequestStatus.SUBMITTED },
          {
            $set: {
              status,
              reviewedBy: objectId(principal.userId, 'Invalid user'),
              reviewedAt: now,
              rejectionReason: reason,
            },
            $push: {
              statusHistory: {
                status,
                at: now,
                actorId: objectId(principal.userId, 'Invalid user'),
                reason,
              },
            },
          },
          { new: true, session },
        )
        .exec();
      if (!updated) {
        throw new AppException(ErrorCode.CONFLICT, 'This request is not awaiting review', 409);
      }
      await this.audit.append({
        ...actor(principal, userAgent),
        action: status === RequestStatus.APPROVED ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
        entity: { type: 'input_request', id: String(request._id) },
        changes: { requestNo: request.requestNo, reason },
        session,
      });
      await this.notifications.enqueue({
        farmerId: farmer.id,
        userId: farmer.userId,
        phone: farmer.smsEnabled ? farmer.phone : undefined,
        event,
        language,
        params: { requestNo: request.requestNo, reason: reason ?? '' },
        related: { type: 'input_request', id: String(request._id) },
        session,
      });
      return updated;
    });
    return toRequestResponse(saved);
  }

  private async insertSubmitted(input: {
    principal: Principal;
    userAgent?: string;
    farmer: FarmerRecord;
    seasonId: string;
    prepared: PreparedRequest;
    idempotencyKey: string;
    channel: (typeof RequestChannel)[keyof typeof RequestChannel];
    consent: { method: (typeof ConsentMethod)[keyof typeof ConsentMethod]; otpChallengeId?: Types.ObjectId; confirmedAt: Date };
    language: NotificationLanguage;
  }): Promise<RequestResponse> {
    try {
      const saved = await this.transaction(async (session) => {
        const existing = await this.requests
          .findOne({
            farmerId: objectId(input.farmer.id, 'Invalid farmer'),
            idempotencyKey: input.idempotencyKey,
          })
          .session(session)
          .exec();
        if (existing) return existing;

        for (const line of input.prepared.lines) {
          await this.allocations.reserve(
            {
              farmerId: input.farmer.id,
              seasonId: input.seasonId,
              inputId: line.inputId,
              qtyKg: line.qtyKg,
            },
            session,
          );
        }
        const now = new Date();
        const requestNo = await this.nextRequestNo(input.prepared.seasonCode, session);
        const [doc] = await this.requests.create(
          [
            {
              requestNo,
              farmerId: objectId(input.farmer.id, 'Invalid farmer'),
              seasonId: objectId(input.seasonId, 'Invalid season'),
              localCenterId: objectId(input.farmer.localCenterId, 'Invalid center'),
              items: input.prepared.lines.map((line) => ({
                inputId: objectId(line.inputId, 'Invalid input'),
                qtyKg: line.qtyKg,
                unitPriceSantimPerKg: line.unitPriceSantimPerKg,
                subsidySantimPerKg: line.subsidySantimPerKg,
                lineTotalSantim: line.lineTotalSantim,
              })),
              totalSantim: input.prepared.totalSantim,
              subsidySantim: input.prepared.subsidySantim,
              payableSantim: input.prepared.payableSantim,
              status: RequestStatus.SUBMITTED,
              waitlisted: false,
              statusHistory: [
                {
                  status: RequestStatus.SUBMITTED,
                  at: now,
                  actorId: objectId(input.principal.userId, 'Invalid user'),
                },
              ],
              channel: input.channel,
              submittedBy: {
                userId: objectId(input.principal.userId, 'Invalid user'),
                role: input.principal.role,
              },
              consent: input.consent,
              idempotencyKey: input.idempotencyKey,
              pickupAttempts: 0,
            },
          ],
          { session },
        );
        await this.audit.append({
          ...actor(input.principal, input.userAgent),
          action: 'REQUEST_SUBMITTED',
          entity: { type: 'input_request', id: String(doc._id) },
          changes: { requestNo, channel: input.channel },
          session,
        });
        await this.notifications.enqueue({
          farmerId: input.farmer.id,
          userId: input.farmer.userId,
          phone: input.farmer.smsEnabled ? input.farmer.phone : undefined,
          event: NotificationEvent.REQUEST_RECEIVED,
          language: input.language,
          params: { requestNo },
          related: { type: 'input_request', id: String(doc._id) },
          session,
        });
        return doc;
      });
      return toRequestResponse(saved);
    } catch (error) {
      if (mongoCode(error) === 11000) {
        const existing = await this.findByKey(input.farmer.id, input.idempotencyKey);
        if (existing) return toRequestResponse(existing);
      }
      throw error;
    }
  }

  private async prepare(
    farmer: FarmerRecord,
    seasonId: string,
    items: { inputId: string; qtyKg: number }[],
  ): Promise<PreparedRequest> {
    if (farmer.status !== FarmerStatus.VERIFIED) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'This farmer is not verified');
    }
    if (duplicateInputId(items)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Each input can appear once');
    }
    const season = await this.seasons.getById(seasonId);
    const closed = seasonClosedReason(season, new Date());
    if (closed) throw new AppException(ErrorCode.SEASON_CLOSED, closed, 409);
    await this.centers.assertServes(farmer.localCenterId, farmer.kebeleId);

    const ordered = [...items].sort((left, right) => left.inputId.localeCompare(right.inputId));
    const lines: PricedLine[] = [];
    let totalSantim = 0;
    let subsidySantim = 0;
    let payableSantim = 0;
    for (const item of ordered) {
      const price = await this.catalog.officialPrice(item.inputId, seasonId, farmer.regionId);
      const amountError = lineAmountError(item.qtyKg, price.unitPriceSantimPerKg, price.subsidySantimPerKg);
      if (amountError) throw new AppException(ErrorCode.VALIDATION_FAILED, amountError);
      const amounts = lineAmounts(item.qtyKg, price.unitPriceSantimPerKg, price.subsidySantimPerKg);
      lines.push({
        inputId: item.inputId,
        qtyKg: item.qtyKg,
        unitPriceSantimPerKg: price.unitPriceSantimPerKg,
        subsidySantimPerKg: price.subsidySantimPerKg,
        lineTotalSantim: amounts.lineTotalSantim,
      });
      totalSantim += amounts.lineTotalSantim;
      subsidySantim += amounts.subsidySantim;
      payableSantim += amounts.payableSantim;
    }
    if (!Number.isSafeInteger(totalSantim) || !Number.isSafeInteger(payableSantim)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Amount is too large');
    }
    return { seasonCode: season.code, lines, totalSantim, subsidySantim, payableSantim };
  }

  private async requireActiveAccount(farmer: FarmerRecord): Promise<void> {
    if (!farmer.userId) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'This farmer has no active account');
    }
    const user = await this.users.getByIdOrFail(farmer.userId);
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'This farmer has no active account');
    }
  }

  private async releaseItems(request: InputRequestDocument, session: ClientSession): Promise<void> {
    for (const item of request.items) {
      await this.allocations.release(
        {
          farmerId: String(request.farmerId),
          seasonId: String(request.seasonId),
          inputId: String(item.inputId),
          qtyKg: item.qtyKg,
        },
        session,
      );
    }
  }

  private async nextRequestNo(seasonCode: string, session: ClientSession): Promise<string> {
    const suffix = requestYearSuffix(seasonCode, new Date());
    const counter = await this.counters
      .findOneAndUpdate({ key: `RQ-${suffix}` }, { $inc: { seq: 1 } }, { upsert: true, new: true, session })
      .exec();
    if (!counter) throw new AppException(ErrorCode.INTERNAL_ERROR, 'Could not number the request', 500);
    return formatRequestNo(suffix, counter.seq);
  }

  private async languageFor(farmer: FarmerRecord): Promise<NotificationLanguage> {
    if (!farmer.userId) return 'en';
    const user = await this.users.findById(farmer.userId);
    if (user?.preferredLanguage === 'am' || user?.preferredLanguage === 'om') return user.preferredLanguage;
    return 'en';
  }

  private async page(filter: Record<string, unknown>, query: ListRequestQuery): Promise<RequestListResponse> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    if (query.cursor) filter._id = { $gt: objectId(query.cursor, 'Invalid cursor') };
    const docs = await this.requests
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean()
      .exec();
    const items = docs.slice(0, limit);
    const next = docs.length > limit ? items[items.length - 1] : undefined;
    return {
      items: items.map((doc) => toRequestResponse(doc)),
      nextCursor: next ? String(next._id) : undefined,
    };
  }

  private async findByKey(farmerId: string, idempotencyKey: string): Promise<InputRequestDocument | null> {
    return this.requests
      .findOne({
        farmerId: objectId(farmerId, 'Invalid farmer'),
        idempotencyKey,
      })
      .exec();
  }

  private async requireRequest(id: string): Promise<InputRequestDocument> {
    if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
    const request = await this.requests.findById(id).exec();
    if (!request) throw new AppException(ErrorCode.NOT_FOUND, 'Request not found', 404);
    return request;
  }

  private async readableFarmer(id: string): Promise<FarmerRecord> {
    return this.farmers.readRecord(id);
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

function actor(principal: Principal, userAgent?: string) {
  return {
    actor: {
      userId: principal.userId,
      role: principal.role,
      ip: principal.ip,
      userAgent,
    },
    requestId: principal.requestId,
  };
}

function objectId(id: string, message: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, message);
  return new Types.ObjectId(id);
}

function mongoCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'number') {
    return error.code;
  }
  return undefined;
}
