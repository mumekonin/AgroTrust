import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import type { Env } from '../../config/env.schema.js';
import { TrustedDevice } from '../schema/trusted-device.schema.js';

const TRUST_MS = 30 * 86_400_000;

@Injectable()
export class DeviceService {
  private readonly pepper: string;

  constructor(
    @InjectModel(TrustedDevice.name) private readonly model: Model<TrustedDevice>,
    config: ConfigService<Env, true>,
  ) {
    this.pepper = config.get('AUTH_PEPPER', { infer: true });
  }

  async isTrusted(userId: string, deviceId: string): Promise<boolean> {
    const now = new Date();
    const device = await this.model
      .findOne({
        userId: new Types.ObjectId(userId),
        deviceIdHash: this.hash(deviceId),
        revokedAt: { $exists: false },
        trustedUntil: { $gt: now },
      })
      .exec();
    if (!device) return false;
    await this.model.updateOne({ _id: device._id }, { $set: { lastSeenAt: now } }).exec();
    return true;
  }

  /** A successful new-device OTP trusts the device for 30 days (§3.5.2). */
  async trust(userId: string, deviceId: string, label?: string): Promise<void> {
    const now = new Date();
    await this.model
      .updateOne(
        { userId: new Types.ObjectId(userId), deviceIdHash: this.hash(deviceId) },
        {
          $set: {
            label,
            lastSeenAt: now,
            trustedUntil: new Date(now.getTime() + TRUST_MS),
          },
          $unset: { revokedAt: '' },
          $setOnInsert: { firstSeenAt: now },
        },
        { upsert: true },
      )
      .exec();
  }

  private hash(deviceId: string): string {
    return createHmac('sha256', this.pepper).update(deviceId).digest('hex');
  }
}
