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
import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { TrustedDevice } from '../schema/trusted-device.schema.js';
const TRUST_MS = 30 * 86_400_000;
let DeviceService = class DeviceService {
    model;
    pepper;
    constructor(model, config) {
        this.model = model;
        this.pepper = config.get('AUTH_PEPPER', { infer: true });
    }
    async isTrusted(userId, deviceId) {
        const now = new Date();
        const device = await this.model
            .findOne({
            userId: new Types.ObjectId(userId),
            deviceIdHash: this.hash(deviceId),
            revokedAt: { $exists: false },
            trustedUntil: { $gt: now },
        })
            .exec();
        if (!device)
            return false;
        await this.model.updateOne({ _id: device._id }, { $set: { lastSeenAt: now } }).exec();
        return true;
    }
    async trust(userId, deviceId, label) {
        const now = new Date();
        await this.model
            .updateOne({ userId: new Types.ObjectId(userId), deviceIdHash: this.hash(deviceId) }, {
            $set: {
                label,
                lastSeenAt: now,
                trustedUntil: new Date(now.getTime() + TRUST_MS),
            },
            $unset: { revokedAt: '' },
            $setOnInsert: { firstSeenAt: now },
        }, { upsert: true })
            .exec();
    }
    hash(deviceId) {
        return createHmac('sha256', this.pepper).update(deviceId).digest('hex');
    }
};
DeviceService = __decorate([
    Injectable(),
    __param(0, InjectModel(TrustedDevice.name)),
    __metadata("design:paramtypes", [Function, ConfigService])
], DeviceService);
export { DeviceService };
//# sourceMappingURL=device.service.js.map