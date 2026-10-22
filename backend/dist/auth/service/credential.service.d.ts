import { ConfigService } from '@nestjs/config';
import type { ClientSession, Model } from 'mongoose';
import { Role } from '../../common/enums/role.enum.js';
import type { Env } from '../../config/env.schema.js';
import { CredentialType, UserCredential } from '../schema/user-credential.schema.js';
export interface PolicyContext {
    fullName?: string;
    phone?: string;
    email?: string;
}
export declare function checkPin(pin: string, ctx?: PolicyContext): string | null;
export declare function checkPassword(password: string, role: Role, ctx?: PolicyContext): string | null;
export declare class CredentialService {
    private readonly model;
    private readonly pepper;
    private readonly gate;
    private dummyHash?;
    constructor(model: Model<UserCredential>, config: ConfigService<Env, true>);
    assertValidPin(pin: string, ctx?: PolicyContext): void;
    assertValidPassword(password: string, role: Role, ctx?: PolicyContext): void;
    private peppered;
    hashSecret(secret: string): Promise<string>;
    private verifyHash;
    private getDummyHash;
    hasCredential(userId: string, type: CredentialType): Promise<boolean>;
    setSecret(userId: string, type: typeof CredentialType.PASSWORD | typeof CredentialType.PIN, secret: string, options?: {
        mustChange?: boolean;
    }, session?: ClientSession): Promise<void>;
    verifySecret(userId: string, type: typeof CredentialType.PASSWORD | typeof CredentialType.PIN, secret: string): Promise<boolean>;
    burnVerification(secret: string): Promise<void>;
    mustChange(userId: string, type: CredentialType): Promise<boolean>;
    isPasswordReused(userId: string, password: string): Promise<boolean>;
    saveTotpSecret(userId: string, secretEnc: string, session?: ClientSession): Promise<void>;
    readTotpSecret(userId: string): Promise<string | null>;
    confirmTotp(userId: string, session?: ClientSession): Promise<void>;
    saveRecoveryCodes(userId: string, codeHashes: string[], session?: ClientSession): Promise<void>;
    readRecoveryHashes(userId: string): Promise<string[]>;
    consumeRecoveryHash(userId: string, hash: string): Promise<void>;
    deleteMfa(userId: string, session?: ClientSession): Promise<void>;
    clearMustChange(userId: string, type: CredentialType, session?: ClientSession): Promise<void>;
}
