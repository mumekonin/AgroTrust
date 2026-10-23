import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { AuditService } from '../../audit/service/audit.service.js';
import { CatalogService } from '../../catalog/service/catalog.service.js';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { SeasonsService } from '../../seasons/service/seasons.service.js';
import type { CreateBatchDto } from '../dto/shipments.dto.js';
import { toBatchResponse, type BatchResponse } from '../response/shipments.response.js';
import { Batch } from '../schema/batch.schema.js';
import { sumBy, type BatchLine } from './coverage.js';

@Injectable()
export class BatchService {
  constructor(
    @InjectModel(Batch.name) private readonly batches: Model<Batch>,
    @InjectConnection() private readonly connection: Connection,
    private readonly catalog: CatalogService,
    private readonly seasons: SeasonsService,
    private readonly audit: AuditService,
  ) {}

  async create(
    principal: Principal,
    input: CreateBatchDto,
    idempotencyKey: string,
    userAgent?: string,
  ): Promise<BatchResponse> {
    const distributorId = assertDistributor(principal);
    await this.catalog.requireActiveInput(input.inputId);
    await this.seasons.getById(input.seasonId);
    const existing = await this.batches
      .findOne({ distributorId: objectId(distributorId, 'Invalid distributor'), idempotencyKey })
      .exec();
    if (existing) return toBatchResponse(existing);
    try {
      const saved = await this.transaction(async (session) => {
        const [doc] = await this.batches.create(
          [
            {
              lotNumber: input.lotNumber.trim(),
              distributorId: objectId(distributorId, 'Invalid distributor'),
              inputId: objectId(input.inputId, 'Invalid input'),
              seasonId: objectId(input.seasonId, 'Invalid season'),
              quantityKg: input.quantityKg,
              dispatchedKg: 0,
              source: input.source.trim(),
              importRef: input.importRef?.trim(),
              documents: input.documents?.map((item) => item.trim()).filter(Boolean) ?? [],
              createdBy: objectId(principal.userId, 'Invalid user'),
              idempotencyKey,
            },
          ],
          { session },
        );
        await this.audit.append({
          actor: { userId: principal.userId, role: principal.role, ip: principal.ip, userAgent },
          action: 'BATCH_REGISTERED',
          entity: { type: 'batch', id: String(doc._id) },
          changes: { lotNumber: doc.lotNumber, quantityKg: doc.quantityKg },
          requestId: principal.requestId,
          session,
        });
        return doc;
      });
      return toBatchResponse(saved);
    } catch (error) {
      if (mongoCode(error) === 11000) {
        const raced = await this.batches
          .findOne({ distributorId: objectId(distributorId, 'Invalid distributor'), idempotencyKey })
          .exec();
        if (raced) return toBatchResponse(raced);
        throw new AppException(ErrorCode.CONFLICT, 'This lot number is already registered', 409);
      }
      throw error;
    }
  }

  /** Keeps dispatched kilograms inside the lot. */
  async claim(distributorId: string, seasonId: string, lines: BatchLine[], session: ClientSession): Promise<void> {
    const totals = sumBy(lines, (line) => line.batchId);
    for (const [batchId, qtyKg] of totals) {
      const sample = lines.find((line) => line.batchId === batchId);
      const result = await this.batches
        .updateOne(
          {
            _id: objectId(batchId, 'Invalid batch'),
            distributorId: objectId(distributorId, 'Invalid distributor'),
            seasonId: objectId(seasonId, 'Invalid season'),
            inputId: sample ? objectId(sample.inputId, 'Invalid input') : undefined,
            $expr: { $lte: [{ $add: ['$dispatchedKg', qtyKg] }, '$quantityKg'] },
          },
          { $inc: { dispatchedKg: qtyKg } },
          { session },
        )
        .exec();
      if (result.matchedCount !== 1) {
        throw new AppException(ErrorCode.CONFLICT, 'This batch cannot cover that quantity', 409);
      }
    }
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

export function assertDistributor(principal: Principal): string {
  if (!principal.roles.includes(Role.DISTRIBUTOR_STAFF) || !principal.scope.distributorId) {
    throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
  }
  return principal.scope.distributorId;
}

function objectId(id: string, message: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, message);
  return new Types.ObjectId(id);
}

function mongoCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'number') return error.code;
  return undefined;
}
