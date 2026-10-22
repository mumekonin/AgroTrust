import { ConfigService } from '@nestjs/config';
import type { Model } from 'mongoose';
import type { Env } from '../../config/env.schema.js';
import { OtpChallenge, type OtpPurpose } from '../schema/otp-challenge.schema.js';
export declare function hashOtp(value: string, pepper: string): string;
export declare function otpMatches(value: string, hash: string, pepper: string): boolean;
export declare function otpSendBlocked(input: {
    sentLastHour: number;
    sentLastDay: number;
    lastSentAt?: Date;
    now: Date;
}): boolean;
export declare class OtpService {
    private readonly model;
    private readonly pepper;
    constructor(model: Model<OtpChallenge>, config: ConfigService<Env, true>);
    issue(input: {
        userId?: string;
        phone?: string;
        purpose: OtpPurpose;
        payloadHash?: string;
        secret?: string;
        ttlMs?: number;
    }): Promise<{
        id: string;
        code: string;
    }>;
    peek(id: string, purpose: OtpPurpose): Promise<{
        userId?: string;
    }>;
    consumeId(id: string): Promise<void>;
    verifyToken(purpose: OtpPurpose, token: string): Promise<{
        userId?: string;
    }>;
    verify(id: string, code: string, purpose?: OtpPurpose): Promise<{
        userId?: string;
        payloadHash?: string;
    }>;
    verifyLatest(input: {
        phone?: string;
        userId?: string;
        purpose: OtpPurpose;
        code: string;
    }): Promise<{
        id: string;
        payloadHash?: string;
    }>;
    private consume;
    private assertCanSend;
}
