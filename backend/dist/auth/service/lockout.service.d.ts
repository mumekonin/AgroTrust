import type { Model } from 'mongoose';
import type { UserStatus } from '../../users/schema/user.schema.js';
import { LoginAttempt } from '../schema/login-attempt.schema.js';
export interface AttemptStamp {
    success: boolean;
    at: Date;
}
export interface LockoutGate {
    ipBlocked: boolean;
    accountBlocked: boolean;
}
export declare function consecutiveFailures(attempts: AttemptStamp[]): {
    count: number;
    lastFailureAt?: Date;
};
export declare function failureIsLockout(consecutive: number): boolean;
export declare function shouldLockAccount(consecutive: number): boolean;
export declare function lockoutFromFailures(consecutive: number, lastFailureAt: Date | undefined, now: Date, status?: UserStatus): 'ok' | 'locked';
export declare class LockoutService {
    private readonly attempts;
    constructor(attempts: Model<LoginAttempt>);
    evaluate(identifierHash: string, ip: string, status?: UserStatus): Promise<LockoutGate>;
    recordFailure(input: {
        identifierHash: string;
        ip: string;
        userId?: string;
        reason: string;
    }): Promise<number>;
    recordSuccess(input: {
        identifierHash: string;
        ip: string;
        userId: string;
    }): Promise<void>;
    private recent;
    private insert;
}
