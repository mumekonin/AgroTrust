import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { normalizeEthiopianPhone } from '../../common/utils/phone.util.js';
import { UserStatus } from '../../users/schema/user.schema.js';
import { UsersService } from '../../users/service/users.service.js';
import type { Principal } from '../../common/guards/auth.decorator.js';
import { CredentialType } from '../schema/user-credential.schema.js';
import { Invitation, InvitationStatus } from '../schema/invitation.schema.js';
import { OtpPurpose } from '../schema/otp-challenge.schema.js';
import { CredentialService } from './credential.service.js';
import { OtpService } from './otp.service.js';

const INVITE_TTL_MS = 72 * 3_600_000;

export function inviteDecision(input: {
  actorRoles: Role[];
  actorRegionIds: string[];
  targetRole: Role;
  targetRegionIds: string[];
}): 'ok' | 'needs_approval' | 'forbidden' {
  if (input.actorRoles.includes(Role.NATIONAL_ADMIN)) {
    if (input.targetRole === Role.NATIONAL_ADMIN) return 'needs_approval';
    if (input.targetRole === Role.REGIONAL_ADMIN || input.targetRole === Role.AUDITOR) {
      return 'ok';
    }
    return 'forbidden';
  }
  if (input.actorRoles.includes(Role.REGIONAL_ADMIN)) {
    const allowed =
      input.targetRole === Role.LOCAL_ADMIN || input.targetRole === Role.DISTRIBUTOR_STAFF;
    if (!allowed || input.targetRegionIds.length === 0) return 'forbidden';
    const regions = new Set(input.actorRegionIds);
    if (!input.targetRegionIds.every((id) => regions.has(id))) return 'forbidden';
    return 'ok';
  }
  return 'forbidden';
}

@Injectable()
export class InvitationService {
  constructor(
    @InjectModel(Invitation.name) private readonly model: Model<Invitation>,
    private readonly users: UsersService,
    private readonly credentials: CredentialService,
    private readonly otp: OtpService,
  ) {}

  async create(
    principal: Principal,
    input: {
      role: Role;
      email?: string;
      phone?: string;
      scope?: {
        regionIds?: string[];
        woredaIds?: string[];
        localCenterIds?: string[];
        distributorId?: string;
      };
    },
  ): Promise<{ id: string; status: InvitationStatus; expiresAt: Date; token?: string }> {
    const phone = input.phone ? normalizeEthiopianPhone(input.phone) : null;
    if (input.phone && !phone) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid Ethiopian phone number');
    }
    if (!phone) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        'A phone number is required so the invitation code can be sent',
      );
    }
    const email = input.email?.trim().toLowerCase();
    if (input.role !== Role.LOCAL_ADMIN && !email) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Email is required for this role');
    }

    const regionIds = input.scope?.regionIds ?? [];
    const decision = inviteDecision({
      actorRoles: principal.roles,
      actorRegionIds: principal.scope.regionIds,
      targetRole: input.role,
      targetRegionIds: regionIds,
    });
    if (decision === 'forbidden') {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot invite that role', 403);
    }

    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    const token = decision === 'ok' ? randomBytes(32).toString('base64url') : undefined;
    const doc = await this.model.create({
      tokenHash: token ? hashToken(token) : undefined,
      role: input.role,
      scope: toScope(input.scope),
      email,
      phone,
      createdBy: new Types.ObjectId(principal.userId),
      expiresAt,
      status: decision === 'ok' ? InvitationStatus.APPROVED : InvitationStatus.PENDING,
    });
    if (decision === 'ok') {
      await this.otp.issue({
        phone,
        purpose: OtpPurpose.INVITATION,
        payloadHash: String(doc._id),
      });
    }
    return { id: String(doc._id), status: doc.status, expiresAt, token };
  }

  async approve(principal: Principal, id: string): Promise<{ token: string; expiresAt: Date }> {
    if (!principal.roles.includes(Role.NATIONAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    const doc = await this.model.findById(id).exec();
    if (!doc || doc.status !== InvitationStatus.PENDING) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Invitation not found', 404);
    }
    if (String(doc.createdBy) === principal.userId) {
      throw new AppException(ErrorCode.FORBIDDEN, 'A second national admin must approve', 403);
    }
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    doc.tokenHash = hashToken(token);
    doc.approvedBy = new Types.ObjectId(principal.userId);
    doc.status = InvitationStatus.APPROVED;
    doc.expiresAt = expiresAt;
    await doc.save();
    if (doc.phone) {
      await this.otp.issue({
        phone: doc.phone,
        purpose: OtpPurpose.INVITATION,
        payloadHash: String(doc._id),
      });
    }
    return { token, expiresAt };
  }

  async revoke(principal: Principal, id: string): Promise<void> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new AppException(ErrorCode.NOT_FOUND, 'Invitation not found', 404);
    if (String(doc.createdBy) !== principal.userId && !principal.roles.includes(Role.NATIONAL_ADMIN)) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You cannot do that', 403);
    }
    doc.status = InvitationStatus.REVOKED;
    await doc.save();
  }

  async accept(input: {
    token: string;
    code: string;
    password: string;
  }): Promise<{ challengeId: string }> {
    const doc = await this.model.findOne({ tokenHash: hashToken(input.token) }).exec();
    if (!doc || doc.status !== InvitationStatus.APPROVED || doc.expiresAt <= new Date()) {
      throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired invitation', 401);
    }
    const otp = await this.otp.verifyLatest({
      phone: doc.phone,
      purpose: OtpPurpose.INVITATION,
      code: input.code,
    });
    if (otp.payloadHash !== String(doc._id)) {
      throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
    }

    this.credentials.assertValidPassword(input.password, doc.role, {
      email: doc.email,
      phone: doc.phone,
    });
    const user = await this.users.create({
      fullName: doc.email?.split('@')[0] || doc.phone || 'Staff',
      roles: [doc.role],
      email: doc.email,
      phone: doc.phone,
      status: UserStatus.PENDING_ACTIVATION,
      scope: doc.scope,
      phoneVerified: true,
    });
    await this.credentials.setSecret(user.id, CredentialType.PASSWORD, input.password);
    doc.status = InvitationStatus.USED;
    doc.usedAt = new Date();
    doc.boundUserId = new Types.ObjectId(user.id);
    await doc.save();

    const challenge = await this.otp.issue({
      userId: user.id,
      phone: doc.phone,
      purpose: OtpPurpose.MFA_ENROLL,
      ttlMs: 30 * 60_000,
    });
    return { challengeId: challenge.id };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toScope(
  scope: {
    regionIds?: string[];
    woredaIds?: string[];
    localCenterIds?: string[];
    distributorId?: string;
  } = {},
) {
  return {
    regionIds: (scope.regionIds ?? []).map((id) => new Types.ObjectId(id)),
    woredaIds: (scope.woredaIds ?? []).map((id) => new Types.ObjectId(id)),
    localCenterIds: (scope.localCenterIds ?? []).map((id) => new Types.ObjectId(id)),
    distributorId: scope.distributorId ? new Types.ObjectId(scope.distributorId) : undefined,
  };
}
