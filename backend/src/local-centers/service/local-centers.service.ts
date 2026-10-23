import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { GeoService } from '../../geo/service/geo.service.js';
import { UserStatus } from '../../users/schema/user.schema.js';
import { UsersService } from '../../users/service/users.service.js';
import type { CreateCenterDto, UpdateCenterDto } from '../dto/local-centers.dto.js';
import {
  toLocalCenterResponse,
  type LocalCenterListResponse,
  type LocalCenterResponse,
} from '../response/local-centers.response.js';
import {
  canAssignCenter,
  CenterStatus,
  centerGeoMatches,
  kebeleInRegion,
  LocalCenter,
  type CenterStatus as CenterStatusValue,
} from '../schema/local-center.schema.js';

const DEFAULT_LIMIT = 50;

@Injectable()
export class LocalCentersService {
  constructor(
    @InjectModel(LocalCenter.name) private readonly centers: Model<LocalCenter>,
    private readonly geo: GeoService,
    private readonly users: UsersService,
  ) {}

  async list(
    principal: Principal,
    query: { status?: CenterStatusValue; cursor?: string; limit?: number },
  ): Promise<LocalCenterListResponse> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const filter: Record<string, unknown> = { ...this.scopeFilter(principal) };
    if (query.status) filter.status = query.status;
    if (query.cursor) {
      if (!Types.ObjectId.isValid(query.cursor)) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid cursor');
      }
      filter._id = { $gt: new Types.ObjectId(query.cursor) };
    }
    const docs = await this.centers.find(filter).sort({ _id: 1 }).limit(limit + 1).lean().exec();
    const page = docs.slice(0, limit);
    const next = docs.length > limit ? page[page.length - 1] : undefined;
    return {
      items: page.map((doc) => toLocalCenterResponse(doc)),
      nextCursor: next ? String(next._id) : undefined,
    };
  }

  async getById(principal: Principal, id: string): Promise<LocalCenterResponse> {
    const center = await this.requireCenter(id);
    this.assertRegion(principal, String(center.geo.regionId), String(center._id));
    return toLocalCenterResponse(center);
  }

  async readName(id: string): Promise<string> {
    const center = await this.requireCenter(id);
    return center.name;
  }

  async idsInScope(principal: Principal): Promise<string[]> {
    const docs = await this.centers.find(this.scopeFilter(principal)).select('_id').lean().exec();
    return docs.map((doc) => String(doc._id));
  }

  async create(principal: Principal, input: CreateCenterDto): Promise<LocalCenterResponse> {
    this.assertRegion(principal, input.geo.regionId);
    assertPoint(input.location.coordinates);
    await this.assertPlace(input.geo);
    await this.assertKebeles(input.servesKebeleIds, input.geo.regionId);
    const adminIds = unique(input.localAdminUserIds ?? []);
    const admins = await this.checkedAdmins(adminIds);

    const doc = await this.centers.create({
      code: input.code.trim(),
      name: input.name.trim(),
      geo: toGeo(input.geo),
      location: { type: 'Point', coordinates: input.location.coordinates },
      address: input.address.trim(),
      openingHours: input.openingHours.trim(),
      localAdminUserIds: adminIds.map((id) => new Types.ObjectId(id)),
      servesKebeleIds: unique(input.servesKebeleIds).map((id) => new Types.ObjectId(id)),
      capacityKg: input.capacityKg,
      status: input.status ?? CenterStatus.ACTIVE,
    });
    for (const admin of admins) await this.grant(admin, String(doc._id));
    return toLocalCenterResponse(doc);
  }

  async update(principal: Principal, id: string, input: UpdateCenterDto): Promise<LocalCenterResponse> {
    const center = await this.requireCenter(id);
    this.assertRegion(principal, String(center.geo.regionId), String(center._id));
    if (!hasChange(input)) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Nothing to update');

    const geo = input.geo ?? {
      regionId: String(center.geo.regionId),
      zoneId: String(center.geo.zoneId),
      woredaId: String(center.geo.woredaId),
      kebeleId: String(center.geo.kebeleId),
    };
    if (input.geo) {
      this.assertRegion(principal, input.geo.regionId);
      await this.assertPlace(input.geo);
    }
    if (input.location) assertPoint(input.location.coordinates);
    if (input.servesKebeleIds || input.geo) {
      await this.assertKebeles(input.servesKebeleIds ?? center.servesKebeleIds.map(String), geo.regionId);
    }

    const set: Record<string, unknown> = {};
    if (input.code) set.code = input.code.trim();
    if (input.name) set.name = input.name.trim();
    if (input.geo) set.geo = toGeo(input.geo);
    if (input.location) set.location = { type: 'Point', coordinates: input.location.coordinates };
    if (input.address) set.address = input.address.trim();
    if (input.openingHours) set.openingHours = input.openingHours.trim();
    if (input.capacityKg !== undefined) set.capacityKg = input.capacityKg;
    if (input.status) set.status = input.status;

    let nextAdmins: string[] | undefined;
    if (input.localAdminUserIds) {
      nextAdmins = unique(input.localAdminUserIds);
      await this.checkedAdmins(nextAdmins, id);
      set.localAdminUserIds = nextAdmins.map((adminId) => new Types.ObjectId(adminId));
    }
    if (input.servesKebeleIds) {
      set.servesKebeleIds = unique(input.servesKebeleIds).map((kebeleId) => new Types.ObjectId(kebeleId));
    }

    const doc = await this.centers.findByIdAndUpdate(id, { $set: set }, { new: true }).lean().exec();
    if (!doc) throw new AppException(ErrorCode.NOT_FOUND, 'Local center not found', 404);
    if (nextAdmins) await this.syncAdmins(center.localAdminUserIds.map(String), nextAdmins, id);
    return toLocalCenterResponse(doc);
  }

  async assertServes(centerId: string, kebeleId: string): Promise<void> {
    const center = await this.requireCenter(centerId);
    if (center.status !== CenterStatus.ACTIVE) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'This center is not active');
    }
    if (!center.servesKebeleIds.some((id) => String(id) === kebeleId)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'This center does not serve the farmer');
    }
  }

  private async checkedAdmins(ids: string[], centerId?: string) {
    const admins = [];
    for (const id of ids) {
      const user = await this.users.getByIdOrFail(id);
      if (!user.roles.includes(Role.LOCAL_ADMIN) || user.status !== UserStatus.ACTIVE) {
        throw new AppException(
          ErrorCode.VALIDATION_FAILED,
          'Each center admin must be an active local admin',
        );
      }
      const current = (user.scope?.localCenterIds ?? []).map(String);
      if (!canAssignCenter(current, centerId)) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'A local admin can cover at most 3 centers');
      }
      admins.push(user);
    }
    return admins;
  }

  private async syncAdmins(previous: string[], next: string[], centerId: string): Promise<void> {
    for (const adminId of next.filter((id) => !previous.includes(id))) {
      const user = await this.users.getByIdOrFail(adminId);
      await this.grant(user, centerId);
    }
    for (const adminId of previous.filter((id) => !next.includes(id))) {
      await this.revoke(adminId, centerId);
    }
  }

  private async grant(
    user: {
      id: string;
      roles: Role[];
      scope: {
        regionIds: Types.ObjectId[];
        woredaIds: Types.ObjectId[];
        localCenterIds: Types.ObjectId[];
        distributorId?: Types.ObjectId;
      };
    },
    centerId: string,
  ): Promise<void> {
    if (user.scope.localCenterIds.map(String).includes(centerId)) return;
    await this.users.updateRolesAndScope(user.id, {
      roles: user.roles,
      scope: {
        regionIds: user.scope.regionIds,
        woredaIds: user.scope.woredaIds,
        localCenterIds: [...user.scope.localCenterIds, new Types.ObjectId(centerId)],
        distributorId: user.scope.distributorId,
      },
    });
  }

  private async revoke(userId: string, centerId: string): Promise<void> {
    const user = await this.users.getByIdOrFail(userId);
    await this.users.updateRolesAndScope(user.id, {
      roles: user.roles,
      scope: {
        regionIds: user.scope.regionIds,
        woredaIds: user.scope.woredaIds,
        localCenterIds: user.scope.localCenterIds.filter((id) => String(id) !== centerId),
        distributorId: user.scope.distributorId,
      },
    });
  }

  private async assertPlace(geo: {
    regionId: string;
    zoneId: string;
    woredaId: string;
    kebeleId: string;
  }): Promise<void> {
    const kebele = await this.geo.getById(geo.kebeleId);
    if (!centerGeoMatches(kebele, geo)) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        'The center kebele does not sit in that region, zone, and woreda',
      );
    }
  }

  private async assertKebeles(ids: string[], regionId: string): Promise<void> {
    for (const id of unique(ids)) {
      const unit = await this.geo.getById(id);
      if (!kebeleInRegion(unit, regionId)) {
        throw new AppException(
          ErrorCode.VALIDATION_FAILED,
          'A served kebele must sit in the center region',
        );
      }
    }
  }

  private assertRegion(principal: Principal, regionId: string, centerId?: string): void {
    if (principal.roles.includes(Role.NATIONAL_ADMIN) || principal.roles.includes(Role.AUDITOR)) return;
    if (principal.roles.includes(Role.REGIONAL_ADMIN) && principal.scope.regionIds.includes(regionId)) {
      return;
    }
    if (centerId && principal.roles.includes(Role.LOCAL_ADMIN) && principal.scope.localCenterIds.includes(centerId)) {
      return;
    }
    throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
  }

  private scopeFilter(principal: Principal): Record<string, unknown> {
    if (principal.roles.includes(Role.NATIONAL_ADMIN) || principal.roles.includes(Role.AUDITOR)) return {};
    if (principal.roles.includes(Role.REGIONAL_ADMIN)) {
      return { 'geo.regionId': { $in: principal.scope.regionIds.map((id) => new Types.ObjectId(id)) } };
    }
    if (principal.roles.includes(Role.LOCAL_ADMIN)) {
      return { _id: { $in: principal.scope.localCenterIds.map((id) => new Types.ObjectId(id)) } };
    }
    throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
  }

  private async requireCenter(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
    const center = await this.centers.findById(id).exec();
    if (!center) throw new AppException(ErrorCode.NOT_FOUND, 'Local center not found', 404);
    return center;
  }
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

function toGeo(geo: { regionId: string; zoneId: string; woredaId: string; kebeleId: string }) {
  return {
    regionId: new Types.ObjectId(geo.regionId),
    zoneId: new Types.ObjectId(geo.zoneId),
    woredaId: new Types.ObjectId(geo.woredaId),
    kebeleId: new Types.ObjectId(geo.kebeleId),
  };
}

function assertPoint(coordinates: number[]): void {
  const [lng, lat] = coordinates;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    throw new AppException(ErrorCode.VALIDATION_FAILED, 'Location must be longitude then latitude');
  }
}

function hasChange(input: UpdateCenterDto): boolean {
  return Object.values(input).some((value) => value !== undefined);
}
