import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Connection, Model } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { normalizeEthiopianPhone } from '../../common/utils/phone.util.js';
import type { Env } from '../../config/env.schema.js';
import { AuthService, type IssuedLogin } from '../../auth/service/auth.service.js';
import { CredentialService } from '../../auth/service/credential.service.js';
import { DeviceService } from '../../auth/service/device.service.js';
import { CredentialType } from '../../auth/schema/user-credential.schema.js';
import { GeoService } from '../../geo/service/geo.service.js';
import { UserStatus } from '../../users/schema/user.schema.js';
import { UsersService } from '../../users/service/users.service.js';
import type { ActivateFarmerDto, ImportFarmerDto, ImportFarmersDto } from '../dto/farmers.dto.js';
import {
  toFarmerResponse,
  type FarmerListResponse,
  type FarmerResponse,
  type ImportReport,
} from '../response/farmers.response.js';
import {
  ACTIVATION_ATTEMPTS,
  ACTIVATION_TTL_MS,
  FarmerActivation,
} from '../schema/farmer-activation.schema.js';
import {
  Farmer,
  FarmerStatus,
  geoChainMatches,
  phoneShareError,
} from '../schema/farmer.schema.js';

const DEFAULT_LIMIT = 50;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class FarmersService {
  private readonly pepper: string;

  constructor(
    @InjectModel(Farmer.name) private readonly farmers: Model<Farmer>,
    @InjectModel(FarmerActivation.name) private readonly activations: Model<FarmerActivation>,
    @InjectConnection() private readonly connection: Connection,
    private readonly users: UsersService,
    private readonly credentials: CredentialService,
    private readonly auth: AuthService,
    private readonly devices: DeviceService,
    private readonly geo: GeoService,
    config: ConfigService<Env, true>,
  ) {
    this.pepper = config.get('AUTH_PEPPER', { infer: true });
  }

  async list(
    principal: Principal,
    query: { status?: FarmerStatus; cursor?: string; limit?: number },
  ): Promise<FarmerListResponse> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const filter: Record<string, unknown> = { ...this.scopeFilter(principal) };
    if (query.status) filter.status = query.status;
    if (query.cursor) {
      if (!Types.ObjectId.isValid(query.cursor)) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid cursor');
      }
      filter._id = { $gt: new Types.ObjectId(query.cursor) };
    }
    const docs = await this.farmers.find(filter).sort({ _id: 1 }).limit(limit + 1).lean().exec();
    const page = docs.slice(0, limit);
    const next = docs.length > limit ? page[page.length - 1] : undefined;
    return {
      items: page.map((doc) => toFarmerResponse(doc)),
      nextCursor: next ? String(next._id) : undefined,
    };
  }

  async verify(principal: Principal, id: string): Promise<FarmerResponse> {
    const farmer = await this.requireFarmer(id);
    this.assertCanSee(principal, farmer);
    if (farmer.status === FarmerStatus.VERIFIED) {
      throw new AppException(ErrorCode.CONFLICT, 'This farmer is already verified', 409);
    }
    if (farmer.status === FarmerStatus.SUSPENDED) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const doc = await this.farmers
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: FarmerStatus.VERIFIED,
            verifiedBy: new Types.ObjectId(principal.userId),
            verifiedAt: new Date(),
          },
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new AppException(ErrorCode.NOT_FOUND, 'Farmer not found', 404);
    return toFarmerResponse(doc);
  }

  async issueActivationCode(
    principal: Principal,
    id: string,
  ): Promise<{ activationCode: string; expiresAt: Date }> {
    const farmer = await this.requireFarmer(id);
    this.assertCanSee(principal, farmer);
    if (farmer.status !== FarmerStatus.VERIFIED) {
      throw new AppException(ErrorCode.CONFLICT, 'Verify the farmer before issuing a code', 409);
    }
    if (farmer.userId) {
      throw new AppException(ErrorCode.CONFLICT, 'This farmer already has an account', 409);
    }
    const code = newActivationCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ACTIVATION_TTL_MS);
    await this.activations
      .updateMany(
        { farmerId: farmer._id, usedAt: { $exists: false } },
        { $set: { expiresAt: now } },
      )
      .exec();
    await this.activations.create({
      farmerId: farmer._id,
      activationCodeHash: hashActivationCode(code, this.pepper),
      issuedBy: new Types.ObjectId(principal.userId),
      issuedAt: now,
      expiresAt,
      attempts: 0,
    });
    return { activationCode: code, expiresAt };
  }

  async importFarmers(principal: Principal, input: ImportFarmersDto): Promise<ImportReport> {
    const errors: ImportReport['errors'] = [];
    const docs: Record<string, unknown>[] = [];
    const seenRegistry = new Set<string>();
    const seenPhones = new Map<string, { sharedPhone: boolean }[]>();

    for (const [index, row] of input.farmers.entries()) {
      const prepared = await this.prepareRow(principal, row, seenRegistry, seenPhones);
      if (prepared.error) errors.push({ index, message: prepared.error });
      else if (prepared.doc) docs.push(prepared.doc);
    }

    if (input.dryRun || errors.length > 0) {
      if (!input.dryRun) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'The import has invalid rows', 400, {
          errors,
        });
      }
      return { dryRun: true, accepted: docs.length, errors };
    }

    if (docs.length > 0) await this.farmers.insertMany(docs);
    return { dryRun: false, accepted: docs.length, errors: [] };
  }

  async activate(input: ActivateFarmerDto & { ip: string; userAgent?: string }): Promise<IssuedLogin> {
    const phone = normalizeEthiopianPhone(input.phone);
    const farmer = phone
      ? await this.farmers.findOne({ 'contact.phone': phone, status: FarmerStatus.VERIFIED }).exec()
      : null;
    const activation =
      farmer && !farmer.userId
        ? await this.activations
            .findOne({ farmerId: farmer._id, usedAt: { $exists: false } })
            .sort({ issuedAt: -1 })
            .exec()
        : null;
    const usable =
      activation &&
      activation.expiresAt > new Date() &&
      activation.attempts < ACTIVATION_ATTEMPTS;
    const matches = activationCodeMatches(
      input.activationCode,
      usable ? activation.activationCodeHash : hashActivationCode('00000000', this.pepper),
      this.pepper,
    );
    if (!farmer || !usable || !matches) {
      if (activation && activation.expiresAt > new Date()) {
        await this.activations.updateOne({ _id: activation._id }, { $inc: { attempts: 1 } }).exec();
      }
      throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
    }

    this.credentials.assertValidPin(input.pin, { phone: farmer.contact.phone, fullName: farmer.fullName });
    const session = await this.connection.startSession();
    let userId = '';
    let roleVersion = 1;
    try {
      await session.withTransaction(async () => {
        activation.usedAt = new Date();
        await activation.save({ session });
        const user = await this.users.create(
          {
            fullName: farmer.fullName,
            roles: [Role.FARMER],
            phone: farmer.contact.phone,
            status: UserStatus.ACTIVE,
            phoneVerified: true,
            scope: {
              regionIds: [farmer.geo.regionId],
              woredaIds: [farmer.geo.woredaId],
              localCenterIds: [farmer.localCenterId],
            },
          },
          session,
        );
        await this.credentials.setSecret(user.id, CredentialType.PIN, input.pin, {}, session);
        farmer.userId = new Types.ObjectId(user.id);
        farmer.contact.phoneVerified = true;
        await farmer.save({ session });
        userId = user.id;
        roleVersion = user.roleVersion;
      });
    } finally {
      await session.endSession();
    }

    await this.devices.trust(userId, input.deviceId, input.deviceLabel);
    return this.auth.openSession({
      userId,
      roles: [Role.FARMER],
      roleVersion,
      deviceId: input.deviceId,
      deviceLabel: input.deviceLabel,
      userAgent: input.userAgent?.slice(0, 256),
      ip: input.ip,
      authMethod: 'pin',
    });
  }

  private async prepareRow(
    principal: Principal,
    row: ImportFarmerDto,
    seenRegistry: Set<string>,
    seenPhones: Map<string, { sharedPhone: boolean }[]>,
  ): Promise<{ error?: string; doc?: Record<string, unknown> }> {
    if (
      !principal.roles.includes(Role.NATIONAL_ADMIN) &&
      !principal.scope.regionIds.includes(row.geo.regionId)
    ) {
      return { error: 'Outside your region' };
    }
    const registryId = row.registryId.trim();
    if (seenRegistry.has(registryId)) return { error: 'Registry id is repeated in this import' };
    seenRegistry.add(registryId);
    if (await this.farmers.exists({ registryId })) return { error: 'Registry id already exists' };

    const phone = normalizeEthiopianPhone(row.phone);
    if (!phone) return { error: 'Invalid Ethiopian phone number' };
    const sharedPhone = row.sharedPhone ?? false;
    const stored = await this.farmers
      .find({ 'contact.phone': phone })
      .select({ 'contact.sharedPhone': 1 })
      .lean()
      .exec();
    const prior = [
      ...stored.map((item) => ({ sharedPhone: item.contact.sharedPhone })),
      ...(seenPhones.get(phone) ?? []),
    ];
    const shareError = phoneShareError(prior, sharedPhone);
    if (shareError) return { error: shareError };
    seenPhones.set(phone, [...(seenPhones.get(phone) ?? []), { sharedPhone }]);

    const kebele = await this.geo.getById(row.geo.kebeleId);
    if (!geoChainMatches(kebele, row.geo)) {
      return { error: 'The kebele does not sit in that region, zone, and woreda' };
    }

    let idRefHash: string | undefined;
    if (row.idNumber?.trim()) {
      idRefHash = hashIdNumber(row.idNumber, this.pepper);
      if (await this.farmers.exists({ idRefHash })) {
        return { error: 'This identity is already registered' };
      }
    }

    return {
      doc: {
        registryId,
        fullName: row.fullName.trim(),
        geo: {
          regionId: new Types.ObjectId(row.geo.regionId),
          zoneId: new Types.ObjectId(row.geo.zoneId),
          woredaId: new Types.ObjectId(row.geo.woredaId),
          kebeleId: new Types.ObjectId(row.geo.kebeleId),
        },
        localCenterId: new Types.ObjectId(row.localCenterId),
        landHoldingHa: row.landHoldingHa,
        crops: row.crops ?? [],
        contact: {
          phone,
          phoneVerified: false,
          smsEnabled: row.smsEnabled ?? true,
          sharedPhone,
        },
        idRefHash,
        status: FarmerStatus.UNLINKED,
      },
    };
  }

  async findOwn(userId: string): Promise<FarmerRecord | null> {
    if (!Types.ObjectId.isValid(userId)) return null;
    const doc = await this.farmers.findOne({ userId: new Types.ObjectId(userId) }).lean().exec();
    return doc ? toRecord(doc) : null;
  }

  async readRecord(id: string): Promise<FarmerRecord> {
    return toRecord(await this.requireFarmer(id));
  }

  /** Callers enforce scope. Phone is for SMS only and must not be copied into distributor responses. */
  async lookupMany(ids: string[]): Promise<Map<string, FarmerLookup>> {
    const unique = [...new Set(ids)].filter((id) => Types.ObjectId.isValid(id));
    const found = new Map<string, FarmerLookup>();
    for (let index = 0; index < unique.length; index += 500) {
      const slice = unique.slice(index, index + 500).map((id) => new Types.ObjectId(id));
      const docs = await this.farmers
        .find({ _id: { $in: slice } })
        .lean()
        .exec();
      for (const doc of docs) {
        found.set(String(doc._id), {
          ...toRecord(doc),
          registryId: doc.registryId,
        });
      }
    }
    return found;
  }

  /** Verified and unverified farmers, excluding suspended. Scope is applied here. */
  async allocationPage(
    principal: Principal,
    query: { regionId?: string; cropFilter?: string; afterId?: string; limit: number },
  ): Promise<FarmerRecord[]> {
    if (!principal.roles.includes(Role.NATIONAL_ADMIN) && !principal.roles.includes(Role.REGIONAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    if (
      query.regionId &&
      !principal.roles.includes(Role.NATIONAL_ADMIN) &&
      !principal.scope.regionIds.includes(query.regionId)
    ) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const filter: Record<string, unknown> = { status: { $ne: FarmerStatus.SUSPENDED } };
    if (!principal.roles.includes(Role.NATIONAL_ADMIN)) {
      filter['geo.regionId'] = {
        $in: principal.scope.regionIds.map((id) => new Types.ObjectId(id)),
      };
    }
    if (query.regionId) filter['geo.regionId'] = new Types.ObjectId(query.regionId);
    if (query.cropFilter) filter.crops = query.cropFilter;
    if (query.afterId) {
      if (!Types.ObjectId.isValid(query.afterId)) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid cursor');
      }
      filter._id = { $gt: new Types.ObjectId(query.afterId) };
    }
    const docs = await this.farmers.find(filter).sort({ _id: 1 }).limit(query.limit).lean().exec();
    return docs.map((doc) => toRecord(doc));
  }

  async matchingIds(principal: Principal): Promise<string[] | null> {
    if (principal.roles.includes(Role.NATIONAL_ADMIN) || principal.roles.includes(Role.AUDITOR)) {
      return null;
    }
    const docs = await this.farmers.find(this.scopeFilter(principal)).select('_id').lean().exec();
    return docs.map((doc) => String(doc._id));
  }

  private scopeFilter(principal: Principal): Record<string, unknown> {
    if (principal.roles.includes(Role.NATIONAL_ADMIN)) return {};
    if (principal.roles.includes(Role.REGIONAL_ADMIN)) {
      return { 'geo.regionId': { $in: principal.scope.regionIds.map((id) => new Types.ObjectId(id)) } };
    }
    if (principal.roles.includes(Role.LOCAL_ADMIN)) {
      return {
        localCenterId: { $in: principal.scope.localCenterIds.map((id) => new Types.ObjectId(id)) },
      };
    }
    throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
  }

  private assertCanSee(
    principal: Principal,
    farmer: { geo: { regionId: Types.ObjectId }; localCenterId: Types.ObjectId },
  ): void {
    if (principal.roles.includes(Role.NATIONAL_ADMIN)) return;
    const regionId = String(farmer.geo.regionId);
    const centerId = String(farmer.localCenterId);
    if (principal.roles.includes(Role.REGIONAL_ADMIN) && principal.scope.regionIds.includes(regionId)) {
      return;
    }
    if (principal.roles.includes(Role.LOCAL_ADMIN) && principal.scope.localCenterIds.includes(centerId)) {
      return;
    }
    throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
  }

  private async requireFarmer(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid id');
    }
    const farmer = await this.farmers.findById(id).exec();
    if (!farmer) throw new AppException(ErrorCode.NOT_FOUND, 'Farmer not found', 404);
    return farmer;
  }
}

export interface FarmerLookup extends FarmerRecord {
  registryId: string;
}

export interface FarmerRecord {
  id: string;
  userId?: string;
  status: FarmerStatus;
  fullName: string;
  localCenterId: string;
  regionId: string;
  kebeleId: string;
  landHoldingHa: number;
  crops: string[];
  phone: string;
  smsEnabled: boolean;
}

function toRecord(doc: {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  status: FarmerStatus;
  fullName: string;
  localCenterId: Types.ObjectId;
  geo: { regionId: Types.ObjectId; kebeleId: Types.ObjectId };
  landHoldingHa: number;
  crops?: string[];
  contact: { phone: string; smsEnabled?: boolean };
}): FarmerRecord {
  return {
    id: String(doc._id),
    userId: doc.userId ? String(doc.userId) : undefined,
    status: doc.status,
    fullName: doc.fullName,
    localCenterId: String(doc.localCenterId),
    regionId: String(doc.geo.regionId),
    kebeleId: String(doc.geo.kebeleId),
    landHoldingHa: doc.landHoldingHa,
    crops: doc.crops ?? [],
    phone: doc.contact.phone,
    smsEnabled: doc.contact.smsEnabled ?? true,
  };
}

function newActivationCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

function hashActivationCode(code: string, pepper: string): string {
  return createHmac('sha256', pepper).update(code).digest('hex');
}

function hashIdNumber(idNumber: string, pepper: string): string {
  const normalized = idNumber.replace(/[\s-]/g, '').toUpperCase();
  return createHmac('sha256', pepper).update(normalized).digest('hex');
}

function activationCodeMatches(code: string, hash: string, pepper: string): boolean {
  const left = Buffer.from(hashActivationCode(code, pepper), 'hex');
  const right = Buffer.from(hash, 'hex');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
