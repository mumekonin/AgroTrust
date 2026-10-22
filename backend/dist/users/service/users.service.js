var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { normalizeEthiopianPhone } from '../../common/utils/phone.util.js';
import { User, UserStatus } from '../schema/user.schema.js';
let UsersService = class UsersService {
    userModel;
    constructor(userModel) {
        this.userModel = userModel;
    }
    async create(input, session) {
        const phone = input.phone ? this.requirePhone(input.phone) : undefined;
        const email = input.email?.trim().toLowerCase();
        if (!phone && !email) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'A phone number or an email is required');
        }
        if (input.roles.includes(Role.FARMER) && !phone) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Farmers require a phone number');
        }
        const [user] = await this.userModel.create([
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
        ], { session });
        return user;
    }
    findById(id) {
        return this.userModel.findById(id).exec();
    }
    async getByIdOrFail(id) {
        const user = await this.findById(id);
        if (!user)
            throw new AppException(ErrorCode.NOT_FOUND, 'User not found', 404);
        return user;
    }
    findByPhone(phone) {
        const normalized = normalizeEthiopianPhone(phone);
        if (!normalized)
            return Promise.resolve(null);
        return this.userModel.findOne({ phone: normalized }).exec();
    }
    findByEmail(email) {
        return this.userModel.findOne({ email: email.trim().toLowerCase() }).exec();
    }
    findByIdentifier(identifier) {
        return identifier.includes('@') ? this.findByEmail(identifier) : this.findByPhone(identifier);
    }
    async getAuthState(userId) {
        const user = await this.userModel
            .findById(userId, { status: 1, roles: 1, roleVersion: 1, scope: 1 })
            .lean()
            .exec();
        if (!user)
            return null;
        return {
            userId: String(user._id),
            status: user.status,
            roles: user.roles,
            roleVersion: user.roleVersion,
            scope: user.scope,
        };
    }
    async setStatus(userId, status, session) {
        const user = await this.userModel
            .findByIdAndUpdate(userId, { $set: { status }, $inc: { roleVersion: 1 } }, { new: true, session })
            .exec();
        if (!user)
            throw new AppException(ErrorCode.NOT_FOUND, 'User not found', 404);
        return user;
    }
    async activate(userId, session) {
        const user = await this.userModel
            .findByIdAndUpdate(userId, { $set: { status: UserStatus.ACTIVE } }, { new: true, session })
            .exec();
        if (!user)
            throw new AppException(ErrorCode.NOT_FOUND, 'User not found', 404);
        return user;
    }
    async updateRolesAndScope(userId, changes, session) {
        const set = {};
        if (changes.roles)
            set['roles'] = changes.roles;
        if (changes.scope)
            set['scope'] = changes.scope;
        const user = await this.userModel
            .findByIdAndUpdate(userId, { $set: set, $inc: { roleVersion: 1 } }, { new: true, session })
            .exec();
        if (!user)
            throw new AppException(ErrorCode.NOT_FOUND, 'User not found', 404);
        return user;
    }
    async bumpRoleVersion(userId, session) {
        const user = await this.userModel
            .findByIdAndUpdate(userId, { $inc: { roleVersion: 1 } }, { new: true, session })
            .exec();
        if (!user)
            throw new AppException(ErrorCode.NOT_FOUND, 'User not found', 404);
        return user.roleVersion;
    }
    async markLogin(userId) {
        const now = new Date();
        await this.userModel
            .updateOne({ _id: userId }, { $set: { lastLoginAt: now, lastAuthAt: now } })
            .exec();
    }
    async setTotpEnabled(userId, enabled, session) {
        await this.userModel
            .updateOne({ _id: userId }, { $set: { 'mfa.totpEnabled': enabled } }, { session })
            .exec();
    }
    requirePhone(phone) {
        const normalized = normalizeEthiopianPhone(phone);
        if (!normalized) {
            throw new AppException(ErrorCode.VALIDATION_FAILED, 'Invalid Ethiopian phone number');
        }
        return normalized;
    }
};
UsersService = __decorate([
    Injectable(),
    __param(0, InjectModel(User.name)),
    __metadata("design:paramtypes", [Function])
], UsersService);
export { UsersService };
//# sourceMappingURL=users.service.js.map