import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { normalizeEthiopianPhone } from '../../common/utils/phone.util.js';
import type { CreateUserInput } from '../dto/create-user.dto.js';
import { User, UserDocument, UserStatus } from '../schema/user.schema.js';

export interface AuthState {
  userId: string;
  status: UserStatus;
  roles: Role[];
  roleVersion: number;
  scope: UserDocument['scope'];
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async create(input: CreateUserInput, session?: ClientSession): Promise<UserDocument> {
    const phone = input.phone ? this.requirePhone(input.phone) : undefined;
    const email = input.email?.trim().toLowerCase();

    if (!phone && !email) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'A phone number or an email is required');
    }
    if (input.roles.includes(Role.FARMER) && !phone) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Farmers require a phone number');
    }

    const [user] = await this.userModel.create(
      [
        {
          fullName: input.fullName,
          roles: input.roles,
          phone,
          email,
          status: input.status,
          preferredLanguage: input.preferredLanguage,
          scope: input.scope,
          phoneVerifiedAt: input.phoneVerified ? new Date() : undefined,
          emailVerifiedAt: input.emailVerified ? new Date() : undefined,
        },
      ],
      { session },
    );
    
    return user;
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async getByIdOrFail(id: string): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) throw new AppException(ErrorCode.NOT_FOUND, 'User not found', 404);
    return user;
  }

  findByPhone(phone: string): Promise<UserDocument | null> {
    const normalized = normalizeEthiopianPhone(phone);
    if (!normalized) return Promise.resolve(null);
    return this.userModel.findOne({ phone: normalized }).exec();
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.trim().toLowerCase() }).exec();
  }

  findByIdentifier(identifier: string): Promise<UserDocument | null> {
    return identifier.includes('@') ? this.findByEmail(identifier) : this.findByPhone(identifier);
  }

  async getAuthState(userId: string): Promise<AuthState | null> {
    const user = await this.userModel
      .findById(userId, { status: 1, roles: 1, roleVersion: 1, scope: 1 })
      .lean()
      .exec();
    if (!user) return null;
    return {
      userId: String(user._id),
      status: user.status,
      roles: user.roles,
      roleVersion: user.roleVersion,
      scope: user.scope,
    };
  }
  async setStatus(userId: string, status: UserStatus, session?: ClientSession): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: { status }, $inc: { roleVersion: 1 } },
        { new: true, session },
      )
      .exec();
    if (!user) throw new AppException(ErrorCode.NOT_FOUND, 'User not found', 404);
    return user;
  }

  async activate(userId: string, session?: ClientSession): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: { status: UserStatus.ACTIVE } }, { new: true, session })
      .exec();
    if (!user) throw new AppException(ErrorCode.NOT_FOUND, 'User not found', 404);
    return user;
  }
  async updateRolesAndScope(
    userId: string,
    changes: Pick<CreateUserInput, 'roles' | 'scope'>,
    session?: ClientSession,
  ): Promise<UserDocument> {
    const set: Record<string, unknown> = {};
    if (changes.roles) set['roles'] = changes.roles;
    if (changes.scope) set['scope'] = changes.scope;

    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: set, $inc: { roleVersion: 1 } }, { new: true, session })
      .exec();
    if (!user) throw new AppException(ErrorCode.NOT_FOUND, 'User not found', 404);
    return user;
  }

  async bumpRoleVersion(userId: string, session?: ClientSession): Promise<number> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $inc: { roleVersion: 1 } }, { new: true, session })
      .exec();
    if (!user) throw new AppException(ErrorCode.NOT_FOUND, 'User not found', 404);
    return user.roleVersion;
  }

  async markLogin(userId: string): Promise<void> {
    const now = new Date();
    await this.userModel
      .updateOne({ _id: userId }, { $set: { lastLoginAt: now, lastAuthAt: now } })
      .exec();
  }

  async setTotpEnabled(userId: string, enabled: boolean, session?: ClientSession): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { $set: { 'mfa.totpEnabled': enabled } }, { session })
      .exec();
  }

  private requirePhone(phone: string): string {
    const normalized = normalizeEthiopianPhone(phone);
    if (!normalized) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid Ethiopian phone number');
    }
    return normalized;
  }
}