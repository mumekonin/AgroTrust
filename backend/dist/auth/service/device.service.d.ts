import { ConfigService } from '@nestjs/config';
import type { Model } from 'mongoose';
import type { Env } from '../../config/env.schema.js';
import { TrustedDevice } from '../schema/trusted-device.schema.js';
export declare class DeviceService {
    private readonly model;
    private readonly pepper;
    constructor(model: Model<TrustedDevice>, config: ConfigService<Env, true>);
    isTrusted(userId: string, deviceId: string): Promise<boolean>;
    trust(userId: string, deviceId: string, label?: string): Promise<void>;
    private hash;
}
