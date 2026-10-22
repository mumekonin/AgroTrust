import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '../../common/enums/role.enum.js';
import type { Env } from '../../config/env.schema.js';
export interface SessionPolicy {
    accessTtlSeconds: number;
    idleSeconds: number;
    absoluteSeconds: number;
}
export declare const SESSION_POLICY: Record<Role, SessionPolicy>;
export declare function primaryRole(roles: Role[]): Role;
export interface AccessTokenClaims {
    sub: string;
    sid: string;
    rv: number;
    role: Role;
    jti: string;
    iat: number;
    exp: number;
}
export interface IssuedAccessToken {
    accessToken: string;
    expiresIn: number;
}
export declare class TokenService implements OnModuleInit {
    private readonly config;
    private signingKey;
    private keyId;
    private readonly verifyKeys;
    constructor(config: ConfigService<Env, true>);
    onModuleInit(): Promise<void>;
    issueAccessToken(input: {
        userId: string;
        sid: string;
        roleVersion: number;
        role: Role;
    }): Promise<IssuedAccessToken>;
    verifyAccessToken(token: string): Promise<AccessTokenClaims>;
    generateRefreshToken(): {
        token: string;
        hash: string;
    };
    hashRefreshToken(token: string): string;
}
