import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema.js';
import { CredentialService } from './credential.service.js';
export declare function encryptTotpSecret(secret: string, rawKey: string): string;
export declare function decryptTotpSecret(payload: string, rawKey: string): string;
export declare function hashRecoveryCode(code: string, pepper: string): string;
export declare function recoveryCodeMatches(code: string, hash: string, pepper: string): boolean;
export declare class TotpService {
    private readonly credentials;
    private readonly key;
    private readonly pepper;
    constructor(credentials: CredentialService, config: ConfigService<Env, true>);
    enroll(userId: string, label: string): Promise<{
        otpauthUri: string;
        qrDataUrl: string;
    }>;
    confirm(userId: string, code: string): Promise<string[]>;
    verify(userId: string, code: string): Promise<boolean>;
    useRecoveryCode(userId: string, code: string): Promise<boolean>;
    private replaceRecoveryCodes;
}
