import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { normalizeEthiopianPhone } from '../../common/utils/phone.util.js';
import { GeoType } from '../../geo/schema/geo-unit.schema.js';
import { GeoService } from '../../geo/service/geo.service.js';
import { LocalCentersService } from '../../local-centers/service/local-centers.service.js';
import { SeasonsService } from '../../seasons/service/seasons.service.js';
import type {
  CreateAssignmentDto,
  CreateDistributorDto,
  UpdateAssignmentDto,
  UpdateDistributorDto,
} from '../dto/distributors.dto.js';
import {
  toAssignmentResponse,
  toDistributorResponse,
  type AssignmentListResponse,
  type AssignmentResponse,
  type DistributorListResponse,
  type DistributorResponse,
} from '../response/distributors.response.js';
import {
  DistributorAssignment,
  type DistributorAssignmentDocument,
} from '../schema/distributor-assignment.schema.js';
import {
  Distributor,
  DistributorStatus,
  servesRegion,
  type DistributorDocument,
  type DistributorStatus as DistributorStatusValue,
} from '../schema/distributor.schema.js';

const DEFAULT_LIMIT = 50;

@Injectable()
export class DistributorsService {
  constructor(
    @InjectModel(Distributor.name) private readonly distributors: Model<Distributor>,
    @InjectModel(DistributorAssignment.name)
    private readonly assignments: Model<DistributorAssignment>,
    private readonly geo: GeoService,
    private readonly seasons: SeasonsService,
    private readonly centers: LocalCentersService,
  ) {}

  async list(
    principal: Principal,
    query: { status?: DistributorStatusValue; cursor?: string; limit?: number },
  ): Promise<DistributorListResponse> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const filter: Record<string, unknown> = { ...this.scopeFilter(principal) };
    if (query.status) filter.status = query.status;
    if (query.cursor) filter._id = { $gt: objectId(query.cursor, 'Invalid cursor') };
    const docs = await this.distributors
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean()
      .exec();
    const page = docs.slice(0, limit);
    const next = docs.length > limit ? page[page.length - 1] : undefined;
    return {
      items: page.map((doc) => toDistributorResponse(doc)),
      nextCursor: next ? String(next._id) : undefined,
    };
  }

  async getById(principal: Principal, id: string): Promise<DistributorResponse> {
    const distributor = await this.requireDistributor(id);
    this.assertCanSee(principal, idsOf(distributor.serviceRegionIds));
    return toDistributorResponse(distributor);
  }

  async create(principal: Principal, input: CreateDistributorDto): Promise<DistributorResponse> {
    const regionIds = await this.regionIds(input.serviceRegionIds);
    this.assertCanWrite(principal, regionIds);
    const doc = await this.distributors.create({
      code: input.code.trim(),
      name: input.name.trim(),
      type: input.type,
      licenceNo: input.licenceNo.trim(),
      contact: contactOf(input.contact),
      serviceRegionIds: regionIds.map((id) => new Types.ObjectId(id)),
      bankAccountRef: blankToUndefined(input.bankAccountRef),
      status: input.status ?? DistributorStatus.ACTIVE,
    });
    return toDistributorResponse(doc);
  }

  async update(
    principal: Principal,
    id: string,
    input: UpdateDistributorDto,
  ): Promise<DistributorResponse> {
    if (!hasChange(input)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Nothing to update');
    }
    const distributor = await this.requireDistributor(id);
    this.assertCanWrite(principal, idsOf(distributor.serviceRegionIds));
    if (input.name !== undefined) distributor.name = input.name.trim();
    if (input.licenceNo !== undefined) distributor.licenceNo = input.licenceNo.trim();
    if (input.contact) {
      const contact = contactOf(input.contact);
      distributor.contact.phone = contact.phone;
      distributor.contact.email = contact.email;
    }
    if (input.serviceRegionIds) {
      const regionIds = await this.regionIds(input.serviceRegionIds);
      this.assertCanWrite(principal, regionIds);
      distributor.serviceRegionIds = regionIds.map((regionId) => new Types.ObjectId(regionId));
    }
    if (input.bankAccountRef !== undefined) {
      distributor.bankAccountRef = blankToUndefined(input.bankAccountRef);
    }
    if (input.status !== undefined) distributor.status = input.status;
    await distributor.save();
    return toDistributorResponse(distributor);
  }

  async listAssignments(
    principal: Principal,
    query: { seasonId?: string; localCenterId?: string; cursor?: string; limit?: number },
  ): Promise<AssignmentListResponse> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const filter: Record<string, unknown> = {};
    if (query.seasonId) filter.seasonId = objectId(query.seasonId, 'Invalid season');
    if (query.localCenterId) {
      await this.centers.getById(principal, query.localCenterId);
      filter.localCenterId = objectId(query.localCenterId, 'Invalid center');
    } else if (!seesAll(principal)) {
      const centerIds = await this.centers.idsInScope(principal);
      filter.localCenterId = { $in: centerIds.map((centerId) => new Types.ObjectId(centerId)) };
    }
    if (query.cursor) filter._id = { $gt: objectId(query.cursor, 'Invalid cursor') };
    const docs = await this.assignments
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean()
      .exec();
    const page = docs.slice(0, limit);
    const next = docs.length > limit ? page[page.length - 1] : undefined;
    return {
      items: page.map((doc) => toAssignmentResponse(doc)),
      nextCursor: next ? String(next._id) : undefined,
    };
  }

  async getAssignment(principal: Principal, id: string): Promise<AssignmentResponse> {
    const assignment = await this.requireAssignment(id);
    await this.centers.getById(principal, String(assignment.localCenterId));
    return toAssignmentResponse(assignment);
  }

  async createAssignment(
    principal: Principal,
    input: CreateAssignmentDto,
  ): Promise<AssignmentResponse> {
    await this.seasons.getById(input.seasonId);
    const center = await this.centers.getById(principal, input.localCenterId);
    const distributor = await this.requireDistributor(input.distributorId);
    this.assertAssignable(distributor, center.geo.regionId);
    const actorId = new Types.ObjectId(principal.userId);
    const doc = await this.assignments.create({
      seasonId: new Types.ObjectId(input.seasonId),
      localCenterId: new Types.ObjectId(input.localCenterId),
      inputCategory: input.inputCategory,
      distributorId: distributor._id,
      priority: input.priority,
      setBy: actorId,
      approvedBy: actorId,
    });
    return toAssignmentResponse(doc);
  }

  async updateAssignment(
    principal: Principal,
    id: string,
    input: UpdateAssignmentDto,
  ): Promise<AssignmentResponse> {
    if (input.distributorId === undefined && input.priority === undefined) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Nothing to update');
    }
    const assignment = await this.requireAssignment(id);
    const center = await this.centers.getById(principal, String(assignment.localCenterId));
    if (input.distributorId !== undefined) {
      const distributor = await this.requireDistributor(input.distributorId);
      this.assertAssignable(distributor, center.geo.regionId);
      assignment.distributorId = distributor._id;
    }
    if (input.priority !== undefined) assignment.priority = input.priority;
    const actorId = new Types.ObjectId(principal.userId);
    assignment.setBy = actorId;
    assignment.approvedBy = actorId;
    await assignment.save();
    return toAssignmentResponse(assignment);
  }

  private scopeFilter(principal: Principal): Record<string, unknown> {
    if (seesAll(principal)) return {};
    if (principal.roles.includes(Role.REGIONAL_ADMIN)) {
      return {
        serviceRegionIds: {
          $in: principal.scope.regionIds.map((id) => new Types.ObjectId(id)),
        },
      };
    }
    throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
  }

  private assertCanSee(principal: Principal, regionIds: string[]): void {
    if (seesAll(principal)) return;
    if (
      principal.roles.includes(Role.REGIONAL_ADMIN) &&
      regionIds.some((id) => principal.scope.regionIds.includes(id))
    ) {
      return;
    }
    throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
  }

  private assertCanWrite(principal: Principal, regionIds: string[]): void {
    if (principal.roles.includes(Role.NATIONAL_ADMIN)) return;
    if (
      principal.roles.includes(Role.REGIONAL_ADMIN) &&
      regionIds.every((id) => principal.scope.regionIds.includes(id))
    ) {
      return;
    }
    throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
  }

  private async regionIds(ids: string[]): Promise<string[]> {
    const uniqueIds = [...new Set(ids)];
    for (const id of uniqueIds) {
      const unit = await this.geo.getById(id);
      if (unit.type !== GeoType.REGION) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'A service region must be a region');
      }
    }
    return uniqueIds;
  }

  private assertAssignable(distributor: DistributorDocument, regionId: string): void {
    if (distributor.status !== DistributorStatus.ACTIVE) {
      throw new AppException(ErrorCode.CONFLICT, 'Distributor is suspended', 409);
    }
    if (!servesRegion(idsOf(distributor.serviceRegionIds), regionId)) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        'This distributor does not serve that center',
      );
    }
  }

  private async requireDistributor(id: string): Promise<DistributorDocument> {
    objectId(id, 'Invalid id');
    const distributor = await this.distributors.findById(id).exec();
    if (!distributor) throw new AppException(ErrorCode.NOT_FOUND, 'Distributor not found', 404);
    return distributor;
  }

  private async requireAssignment(id: string): Promise<DistributorAssignmentDocument> {
    objectId(id, 'Invalid id');
    const assignment = await this.assignments.findById(id).exec();
    if (!assignment) throw new AppException(ErrorCode.NOT_FOUND, 'Assignment not found', 404);
    return assignment;
  }
}

function seesAll(principal: Principal): boolean {
  return (
    principal.roles.includes(Role.NATIONAL_ADMIN) || principal.roles.includes(Role.AUDITOR)
  );
}

function idsOf(ids: Array<Types.ObjectId | string>): string[] {
  return ids.map(String);
}

function objectId(id: string, message: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, message);
  return new Types.ObjectId(id);
}

function phoneOf(input: string): string {
  const phone = normalizeEthiopianPhone(input);
  if (!phone) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid Ethiopian phone number');
  return phone;
}

function contactOf(contact: { phone: string; email?: string }): { phone: string; email?: string } {
  const email = contact.email?.trim().toLowerCase();
  return { phone: phoneOf(contact.phone), email: email || undefined };
}

function blankToUndefined(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function hasChange(input: UpdateDistributorDto): boolean {
  return Object.values(input).some((value) => value !== undefined);
}
