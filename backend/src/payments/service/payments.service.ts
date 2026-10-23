import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { AuditService } from '../../audit/service/audit.service.js';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { FarmersService } from '../../farmers/service/farmers.service.js';
import { LocalCentersService } from '../../local-centers/service/local-centers.service.js';
import { NotificationEvent, type NotificationLanguage } from '../../notifications/schema/notification.schema.js';
import { NotificationsService } from '../../notifications/service/notifications.service.js';
import { formatBirr, payableSantim, paymentReference } from '../../requisitions/service/supply.js';
import { RequisitionsService } from '../../requisitions/service/requisitions.service.js';
import { RequestPaymentService, type PaymentRequest } from '../../requests/service/request-payment.service.js';
import { RequestStatus } from '../../requests/schema/input-request.schema.js';
import { UsersService } from '../../users/service/users.service.js';
import type { ConfirmPaymentDto, ListPaymentQuery } from '../dto/payments.dto.js';
import { toPaymentResponse, type PaymentListResponse, type PaymentResponse } from '../response/payments.response.js';
import { Payment, PaymentProvider, PaymentStatus } from '../schema/payment.schema.js';

const DEFAULT_LIMIT = 50;

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private readonly payments: Model<Payment>,
    @InjectConnection() private readonly connection: Connection,
    private readonly requests: RequestPaymentService,
    private readonly requisitions: RequisitionsService,
    private readonly centers: LocalCentersService,
    private readonly farmers: FarmersService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async confirm(
    principal: Principal,
    requestId: string,
    input: ConfirmPaymentDto,
    idempotencyKey: string,
    userAgent?: string,
  ): Promise<PaymentResponse> {
    const slipNo = input.slipNo.trim();
    if (!slipNo) throw new AppException(ErrorCode.VALIDATION_FAILED, 'The bank slip number is required');
    const request = await this.requests.read(requestId);
    this.assertLocalAdmin(principal, request.localCenterId);
    const byKey = await this.payments.findOne({ idempotencyKey }).exec();
    if (byKey) {
      if (String(byKey.requestId) !== request.id) {
        throw new AppException(ErrorCode.CONFLICT, 'Idempotency-Key was already used', 409);
      }
      return toPaymentResponse(byKey);
    }
    const byRequest = await this.payments.findOne({ requestId: objectId(request.id, 'Invalid request') }).exec();
    if (byRequest) {
      if (byRequest.providerRef !== slipNo) {
        throw new AppException(ErrorCode.CONFLICT, 'This request is already paid', 409);
      }
      return toPaymentResponse(byRequest);
    }
    if (request.status !== RequestStatus.ACCEPTED) {
      throw new AppException(ErrorCode.CONFLICT, 'This request is not awaiting payment', 409);
    }
    if (!request.requisitionId) {
      throw new AppException(ErrorCode.CONFLICT, 'This request is not on a requisition', 409);
    }
    const due = request.paymentDueAt;
    if (!due || due.getTime() <= Date.now()) {
      throw new AppException(ErrorCode.CONFLICT, 'The payment deadline has passed', 409);
    }
    const amountSantim = payableSantim(
      request.items.map((item) => ({
        acceptedQtyKg: item.acceptedQtyKg ?? 0,
        unitPriceSantimPerKg: item.unitPriceSantimPerKg,
        subsidySantimPerKg: item.subsidySantimPerKg,
      })),
    );
    const requisitionId = request.requisitionId;
    try {
      const saved = await this.transaction(async (session) => {
        const now = new Date();
        const paid = await this.requests.markPaid(request.id, amountSantim, now, principal.userId, session);
        if (!paid) throw new AppException(ErrorCode.CONFLICT, 'This request is not awaiting payment', 409);
        await this.requisitions.recordPaid(
          requisitionId,
          paid.items.map((item) => ({ inputId: item.inputId, qtyKg: item.acceptedQtyKg ?? 0 })),
          session,
        );
        const [doc] = await this.payments.create(
          [
            {
              paymentNo: paymentReference(request.requestNo),
              requestId: objectId(request.id, 'Invalid request'),
              farmerId: objectId(request.farmerId, 'Invalid farmer'),
              amountSantim,
              provider: PaymentProvider.BANK,
              providerRef: slipNo,
              status: PaymentStatus.CONFIRMED,
              idempotencyKey,
              initiatedAt: now,
              confirmedAt: now,
            },
          ],
          { session },
        );
        await this.audit.append({
          actor: { userId: principal.userId, role: principal.role, ip: principal.ip, userAgent },
          action: 'PAYMENT_CONFIRMED',
          entity: { type: 'payment', id: String(doc._id) },
          changes: { paymentNo: doc.paymentNo, requestId: request.id, amountSantim },
          requestId: principal.requestId,
          localCenterId: request.localCenterId,
          session,
        });
        await this.notifyConfirmed(request, amountSantim, session);
        return doc;
      });
      return toPaymentResponse(saved);
    } catch (error) {
      if (mongoCode(error) === 11000) {
        const raced = await this.payments.findOne({ idempotencyKey }).exec();
        if (raced && String(raced.requestId) === request.id) return toPaymentResponse(raced);
        const sameSlip = await this.payments
          .findOne({ provider: PaymentProvider.BANK, providerRef: slipNo })
          .exec();
        if (sameSlip && String(sameSlip.requestId) === request.id) return toPaymentResponse(sameSlip);
        throw new AppException(ErrorCode.CONFLICT, 'This bank slip is already recorded', 409);
      }
      throw error;
    }
  }

  async listForDistributor(principal: Principal, query: ListPaymentQuery): Promise<PaymentListResponse> {
    const distributorId = this.assertDistributor(principal);
    const requisitionIds = await this.requisitions.idsForDistributor(distributorId);
    const requestIds = await this.requests.idsForRequisitions(requisitionIds);
    return this.page(requestIds, query);
  }

  async listForAdmin(principal: Principal, query: ListPaymentQuery): Promise<PaymentListResponse> {
    if (principal.roles.includes(Role.NATIONAL_ADMIN) || principal.roles.includes(Role.AUDITOR)) {
      return this.page(undefined, query);
    }
    if (!principal.roles.includes(Role.REGIONAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const centerIds = await this.centers.idsInScope(principal);
    const requestIds = await this.requests.idsInCenters(centerIds);
    return this.page(requestIds, query);
  }

  async processDue(now = new Date()): Promise<void> {
    await this.requests.remindDue(now);
    await this.requests.expireUnpaid(now, { userId: 'system', role: 'system', ip: 'worker' });
  }

  private async page(requestIds: string[] | undefined, query: ListPaymentQuery): Promise<PaymentListResponse> {
    if (requestIds && requestIds.length === 0) return { items: [] };
    const limit = query.limit ?? DEFAULT_LIMIT;
    const filter: Record<string, unknown> = {};
    if (requestIds) filter.requestId = { $in: requestIds.map((id) => objectId(id, 'Invalid request')) };
    if (query.status) filter.status = query.status;
    if (query.cursor) filter._id = { $gt: objectId(query.cursor, 'Invalid cursor') };
    const docs = await this.payments.find(filter).sort({ _id: 1 }).limit(limit + 1).lean().exec();
    const pageDocs = docs.slice(0, limit);
    const next = docs.length > limit ? pageDocs[pageDocs.length - 1] : undefined;
    return {
      items: pageDocs.map((doc) => toPaymentResponse(doc)),
      nextCursor: next ? String(next._id) : undefined,
    };
  }

  private async notifyConfirmed(request: PaymentRequest, amountSantim: number, session: ClientSession): Promise<void> {
    const farmers = await this.farmers.lookupMany([request.farmerId]);
    const farmer = farmers.get(request.farmerId);
    const language = await this.languageFor(farmer?.userId);
    await this.notifications.enqueue({
      farmerId: request.farmerId,
      userId: farmer?.userId,
      phone: farmer?.smsEnabled ? farmer.phone : undefined,
      event: NotificationEvent.PAYMENT_CONFIRMED,
      language,
      params: { amount: formatBirr(amountSantim) },
      related: { type: 'input_request', id: request.id },
      session,
    });
  }

  private async languageFor(userId?: string): Promise<NotificationLanguage> {
    if (!userId) return 'en';
    const user = await this.users.findById(userId);
    if (user?.preferredLanguage === 'am' || user?.preferredLanguage === 'om') return user.preferredLanguage;
    return 'en';
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
