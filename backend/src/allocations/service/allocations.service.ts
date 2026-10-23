import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { AuditService } from '../../audit/service/audit.service.js';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { CatalogService } from '../../catalog/service/catalog.service.js';
import { FarmersService } from '../../farmers/service/farmers.service.js';
import { GeoService } from '../../geo/service/geo.service.js';
import { SeasonsService } from '../../seasons/service/seasons.service.js';
import type { AdjustAllocationDto, CreateAllocationRuleDto } from '../dto/allocations.dto.js';
import {
  toAllocationResponse,
  toAllocationRuleResponse,
  type AllocationListResponse,
  type AllocationResponse,
  type AllocationRuleResponse,
  type GenerateAllocationsResponse,
} from '../response/allocations.response.js';
import { AllocationAdjustment } from '../schema/allocation-adjustment.schema.js';
import { Allocation } from '../schema/allocation.schema.js';
import { AllocationRule, type AllocationRuleDocument } from '../schema/allocation-rule.schema.js';
import { entitledKg, outsideNationalBounds, ruleFieldError } from './entitlement.js';

const PAGE = 300;
const DEFAULT_LIMIT = 50;

@Injectable()
export class AllocationsService {
  constructor(
    @InjectModel(AllocationRule.name) private readonly rules: Model<AllocationRule>,
    @InjectModel(Allocation.name) private readonly allocations: Model<Allocation>,
    @InjectModel(AllocationAdjustment.name) private readonly adjustments: Model<AllocationAdjustment>,
    @InjectConnection() private readonly connection: Connection,
    private readonly farmers: FarmersService,
    private readonly seasons: SeasonsService,
    private readonly geo: GeoService,
    private readonly catalog: CatalogService,
    private readonly audit: AuditService,
  ) {}

  async listMine(
    principal: Principal,
    query: { cursor?: string; limit?: number },
  ): Promise<AllocationListResponse> {
    const farmer = await this.farmers.findOwn(principal.userId);
    if (!farmer) return { items: [] };
    return this.page({ farmerId: objectId(farmer.id, 'Invalid farmer') }, query);
  }

  async createRule(
    principal: Principal,
    input: CreateAllocationRuleDto,
    userAgent?: string,
  ): Promise<AllocationRuleResponse> {
    const fieldError = ruleFieldError(input);
    if (fieldError) throw new AppException(ErrorCode.VALIDATION_FAILED, fieldError);
    await this.seasons.getById(input.seasonId);
    await this.catalog.requireActiveInput(input.inputId);
    const regionId = input.regionId ?? null;
    if (regionId) {
      await this.requireRegion(regionId);
      this.assertAdmin(principal, regionId);
      const national = await this.latestApproved(input.seasonId, input.inputId, null);
      if (!national) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'Approve a national rule before a regional one');
      }
      const bounds = outsideNationalBounds(
        { ...input, cropFilter: input.cropFilter?.trim() },
        national,
      );
      if (bounds) throw new AppException(ErrorCode.VALIDATION_FAILED, bounds);
    } else if (!principal.roles.includes(Role.NATIONAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'Only a national admin can set a national rule', 403);
    }

    const latest = await this.rules
      .findOne({
        seasonId: objectId(input.seasonId, 'Invalid season'),
        inputId: objectId(input.inputId, 'Invalid input'),
        regionId: regionId ? objectId(regionId, 'Invalid region') : null,
      })
      .sort({ version: -1 })
      .select({ version: 1 })
      .exec();
    const version = (latest?.version ?? 0) + 1;
    const cropFilter = input.cropFilter?.trim();

    const saved = await this.transaction(async (session) => {
      const [doc] = await this.rules.create(
        [
          {
            seasonId: objectId(input.seasonId, 'Invalid season'),
            inputId: objectId(input.inputId, 'Invalid input'),
            regionId: regionId ? objectId(regionId, 'Invalid region') : null,
            rateKgPerHa: input.rateKgPerHa,
            minKg: input.minKg,
            maxHa: input.maxHa,
            maxKgPerFarmer: input.maxKgPerFarmer,
            cropFilter: cropFilter || undefined,
            version,
            effectiveFrom: new Date(input.effectiveFrom),
            createdBy: objectId(principal.userId, 'Invalid user'),
          },
        ],
        { session },
      );
      await this.audit.append({
        ...actor(principal, userAgent),
        action: 'ALLOCATION_RULE_CREATED',
        entity: { type: 'allocation_rule', id: String(doc._id) },
        changes: { version, regionId },
        session,
      });
      return doc;
    });
    return toAllocationRuleResponse(saved);
  }

  async approveRule(principal: Principal, id: string, userAgent?: string): Promise<AllocationRuleResponse> {
    const rule = await this.requireRule(id);
    if (rule.approvedBy) {
      throw new AppException(ErrorCode.CONFLICT, 'This rule is already approved', 409);
    }
    if (String(rule.createdBy) === principal.userId) {
      throw new AppException(ErrorCode.FORBIDDEN, 'A second admin must approve', 403);
    }
    if (rule.regionId) this.assertAdmin(principal, String(rule.regionId));
    else if (!principal.roles.includes(Role.NATIONAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'A national admin must approve a national rule', 403);
    }

    const saved = await this.transaction(async (session) => {
      rule.approvedBy = objectId(principal.userId, 'Invalid user');
      await rule.save({ session });
      await this.audit.append({
        ...actor(principal, userAgent),
        action: 'ALLOCATION_RULE_APPROVED',
        entity: { type: 'allocation_rule', id: String(rule._id) },
        changes: { version: rule.version },
        session,
      });
      return rule;
    });
    return toAllocationRuleResponse(saved);
  }

  /** Inserts missing entitlements. An existing row is left as it was, including its rule version. */
  async generate(principal: Principal, ruleId: string, userAgent?: string): Promise<GenerateAllocationsResponse> {
    const rule = await this.requireRule(ruleId);
    if (!rule.approvedBy) {
      throw new AppException(ErrorCode.CONFLICT, 'This rule is not approved', 409);
    }
    if (rule.effectiveFrom.getTime() > Date.now()) {
      throw new AppException(ErrorCode.CONFLICT, 'This rule is not in force yet', 409);
    }
    const regionId = rule.regionId ? String(rule.regionId) : undefined;
    if (!regionId && !principal.roles.includes(Role.NATIONAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'Only a national admin can generate a national rule', 403);
    }
    if (regionId) this.assertAdmin(principal, regionId);

    let created = 0;
    let unchanged = 0;
    let afterId: string | undefined;
    for (;;) {
      const farmers = await this.farmers.allocationPage(principal, {
        regionId,
        cropFilter: rule.cropFilter,
        afterId,
        limit: PAGE,
      });
      if (farmers.length === 0) break;
      for (const farmer of farmers) {
        const qty = entitledKg({
          landHoldingHa: farmer.landHoldingHa,
          rateKgPerHa: rule.rateKgPerHa,
          minKg: rule.minKg,
          maxHa: rule.maxHa,
          maxKgPerFarmer: rule.maxKgPerFarmer,
        });
        const inserted = await this.insertIfAbsent({
          farmerId: farmer.id,
          seasonId: String(rule.seasonId),
          inputId: String(rule.inputId),
          entitledKg: qty,
          basis: {
            landHoldingHa: farmer.landHoldingHa,
            rateKgPerHa: rule.rateKgPerHa,
            ruleVersion: rule.version,
          },
        });
        if (inserted) created += 1;
        else unchanged += 1;
      }
      afterId = farmers[farmers.length - 1]?.id;
      if (farmers.length < PAGE) break;
    }

    await this.audit.append({
      ...actor(principal, userAgent),
      action: 'ALLOCATIONS_GENERATED',
      entity: { type: 'allocation_rule', id: String(rule._id) },
      changes: { created, unchanged, version: rule.version },
    });
    return { ruleId: String(rule._id), created, unchanged };
  }

  async adjust(
    principal: Principal,
    input: AdjustAllocationDto,
    userAgent?: string,
  ): Promise<AllocationResponse> {
    const farmer = await this.farmers.readRecord(input.farmerId);
    this.assertAdmin(principal, farmer.regionId);
    const allocation = await this.allocations
      .findOne({
        farmerId: objectId(input.farmerId, 'Invalid farmer'),
        seasonId: objectId(input.seasonId, 'Invalid season'),
        inputId: objectId(input.inputId, 'Invalid input'),
      })
      .exec();
    if (!allocation) throw new AppException(ErrorCode.NOT_FOUND, 'Allocation not found', 404);
    if (allocation.entitledKg === input.entitledKg) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Nothing to change');
    }
    const reason = input.reason.trim();
    const previous = allocation.entitledKg;

    const saved = await this.transaction(async (session) => {
      const updated = await this.allocations
        .findOneAndUpdate(
          {
            _id: allocation._id,
            $expr: { $lte: [{ $add: ['$reservedKg', '$purchasedKg'] }, input.entitledKg] },
          },
          { $set: { entitledKg: input.entitledKg } },
          { new: true, session },
        )
        .exec();
      if (!updated) {
        throw new AppException(
          ErrorCode.CONFLICT,
          'That entitlement is below what is already reserved or purchased',
          409,
        );
      }
      await this.adjustments.create(
        [
          {
            allocationId: allocation._id,
            farmerId: allocation.farmerId,
            seasonId: allocation.seasonId,
            inputId: allocation.inputId,
            previousEntitledKg: previous,
            entitledKg: input.entitledKg,
            reason,
            actorId: objectId(principal.userId, 'Invalid user'),
          },
        ],
        { session },
      );
      await this.audit.append({
        ...actor(principal, userAgent),
        action: 'ALLOCATION_ADJUSTED',
        entity: { type: 'allocation', id: String(allocation._id) },
        changes: { previousEntitledKg: previous, entitledKg: input.entitledKg, reason },
        session,
      });
      return updated;
    });
    return toAllocationResponse(saved);
  }

  /** §2.9.1. Conditional reserve. No match, including a missing row, is QUOTA_EXCEEDED. */
  async reserve(
    input: { farmerId: string; seasonId: string; inputId: string; qtyKg: number },
    session: ClientSession,
  ): Promise<void> {
    const result = await this.allocations
      .updateOne(
        {
          farmerId: objectId(input.farmerId, 'Invalid farmer'),
          seasonId: objectId(input.seasonId, 'Invalid season'),
          inputId: objectId(input.inputId, 'Invalid input'),
          $expr: {
            $lte: [{ $add: ['$reservedKg', '$purchasedKg', input.qtyKg] }, '$entitledKg'],
          },
        },
        { $inc: { reservedKg: input.qtyKg } },
        { session },
      )
      .exec();
    if (result.matchedCount !== 1) {
      throw new AppException(ErrorCode.QUOTA_EXCEEDED, 'Quota exceeded', 409);
    }
  }

  async release(
    input: { farmerId: string; seasonId: string; inputId: string; qtyKg: number },
    session: ClientSession,
  ): Promise<void> {
    const result = await this.allocations
      .updateOne(
        {
          farmerId: objectId(input.farmerId, 'Invalid farmer'),
          seasonId: objectId(input.seasonId, 'Invalid season'),
          inputId: objectId(input.inputId, 'Invalid input'),
          reservedKg: { $gte: input.qtyKg },
        },
        { $inc: { reservedKg: -input.qtyKg } },
        { session },
      )
      .exec();
    if (result.matchedCount !== 1) {
      throw new AppException(ErrorCode.CONFLICT, 'Quota could not be released', 409);
    }
  }

  /** Moves reserved kilograms into purchased kilograms when the farmer collects. */
  async purchase(
    input: { farmerId: string; seasonId: string; inputId: string; qtyKg: number },
    session: ClientSession,
  ): Promise<void> {
    const result = await this.allocations
      .updateOne(
        {
          farmerId: objectId(input.farmerId, 'Invalid farmer'),
          seasonId: objectId(input.seasonId, 'Invalid season'),
          inputId: objectId(input.inputId, 'Invalid input'),
          reservedKg: { $gte: input.qtyKg },
        },
        { $inc: { reservedKg: -input.qtyKg, purchasedKg: input.qtyKg } },
        { session },
      )
      .exec();
    if (result.matchedCount !== 1) {
      throw new AppException(ErrorCode.CONFLICT, 'Quota could not be purchased', 409);
    }
  }

  private async insertIfAbsent(input: {
    farmerId: string;
    seasonId: string;
    inputId: string;
    entitledKg: number;
    basis: { landHoldingHa: number; rateKgPerHa: number; ruleVersion: number };
  }): Promise<boolean> {
    try {
      const previous = await this.allocations
        .findOneAndUpdate(
          {
            farmerId: objectId(input.farmerId, 'Invalid farmer'),
            seasonId: objectId(input.seasonId, 'Invalid season'),
            inputId: objectId(input.inputId, 'Invalid input'),
          },
          {
            $setOnInsert: {
              entitledKg: input.entitledKg,
              reservedKg: 0,
              purchasedKg: 0,
              basis: input.basis,
            },
          },
          { upsert: true, new: false },
        )
        .exec();
      return previous === null;
    } catch (error) {
      if (mongoCode(error) === 11000) return false;
      throw error;
    }
  }

  private async page(
    filter: Record<string, unknown>,
    query: { cursor?: string; limit?: number },
  ): Promise<AllocationListResponse> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    if (query.cursor) {
      if (!Types.ObjectId.isValid(query.cursor)) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid cursor');
      }
      filter._id = { $gt: new Types.ObjectId(query.cursor) };
    }
    const docs = await this.allocations.find(filter).sort({ _id: 1 }).limit(limit + 1).lean().exec();
    const items = docs.slice(0, limit);
    const next = docs.length > limit ? items[items.length - 1] : undefined;
    return {
      items: items.map((doc) => toAllocationResponse(doc)),
      nextCursor: next ? String(next._id) : undefined,
    };
  }

  private async latestApproved(seasonId: string, inputId: string, regionId: string | null) {
    return this.rules
      .findOne({
        seasonId: objectId(seasonId, 'Invalid season'),
        inputId: objectId(inputId, 'Invalid input'),
        regionId: regionId ? objectId(regionId, 'Invalid region') : null,
        approvedBy: { $exists: true },
      })
      .sort({ version: -1 })
      .exec();
  }

  private async requireRule(id: string): Promise<AllocationRuleDocument> {
    if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
    const rule = await this.rules.findById(id).exec();
    if (!rule) throw new AppException(ErrorCode.NOT_FOUND, 'Allocation rule not found', 404);
    return rule;
  }

  private async requireRegion(id: string): Promise<void> {
    const region = await this.geo.getById(id);
    if (region.type !== 'region') {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'regionId must be a region');
    }
  }

  private assertAdmin(principal: Principal, regionId: string): void {
    if (principal.roles.includes(Role.NATIONAL_ADMIN)) return;
    if (principal.roles.includes(Role.REGIONAL_ADMIN) && principal.scope.regionIds.includes(regionId)) return;
    throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
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
