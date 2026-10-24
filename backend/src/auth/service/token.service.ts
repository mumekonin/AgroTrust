import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, importPKCS8, importSPKI, jwtVerify } from 'jose';
import { ALL_ROLES, Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Env } from '../../config/env.schema.js';

type PrivateKey = Awaited<ReturnType<typeof importPKCS8>>;
type PublicKey = Awaited<ReturnType<typeof importSPKI>>;

// ---- session lifetimes (§3.3.1 and §3.3.2) ----

export interface SessionPolicy {
  accessTtlSeconds: number;
  idleSeconds: number;
  absoluteSeconds: number;
}

const MIN = 60;
const HOUR = 3600;
const DAY = 86_400;

export const SESSION_POLICY: Record<Role, SessionPolicy> = {
  [Role.FARMER]: { accessTtlSeconds: 15 * MIN, idleSeconds: 30 * DAY, absoluteSeconds: 90 * DAY },
  [Role.LOCAL_ADMIN]: { accessTtlSeconds: 30 * MIN, idleSeconds: 30 * MIN, absoluteSeconds: 8 * HOUR },
  [Role.DISTRIBUTOR_STAFF]: { accessTtlSeconds: 30 * MIN, idleSeconds: 30 * MIN, absoluteSeconds: 8 * HOUR },
  [Role.REGIONAL_ADMIN]: { accessTtlSeconds: 30 * MIN, idleSeconds: 30 * MIN, absoluteSeconds: 8 * HOUR },
  [Role.NATIONAL_ADMIN]: { accessTtlSeconds: 30 * MIN, idleSeconds: 30 * MIN, absoluteSeconds: 8 * HOUR },
  [Role.AUDITOR]: { accessTtlSeconds: 30 * MIN, idleSeconds: 30 * MIN, absoluteSeconds: 8 * HOUR },
};

/** Most privileged role first. Used when a user has several roles. */
const ROLE_PRIORITY: Role[] = [
  Role.NATIONAL_ADMIN,
  Role.REGIONAL_ADMIN,
  Role.AUDITOR,
  Role.LOCAL_ADMIN,
  Role.DISTRIBUTOR_STAFF,
  Role.FARMER,
];

export function primaryRole(roles: Role[]): Role {
  const found = ROLE_PRIORITY.find((role) => roles.includes(role));
  if (!found) throw new Error('User has no valid role');
  return found;
}

// ---- tokens ----

/** Small on purpose: no PII, no scope lists (§3.3.1). */
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

const decodePem = (base64: string): string => Buffer.from(base64, 'base64').toString('utf8');

@Injectable()
export class TokenService implements OnModuleInit {
  private signingKey!: PrivateKey;
  private keyId!: string;
  private readonly verifyKeys = new Map<string, PublicKey>();

  constructor(private readonly config: ConfigService<Env, true>) {}

  async onModuleInit(): Promise<void> {
    this.keyId = this.config.get('JWT_KEY_ID', { infer: true });
    this.signingKey = await importPKCS8(
      decodePem(this.config.get('JWT_PRIVATE_KEY', { infer: true })),
      'EdDSA',
    );
    this.verifyKeys.set(
      this.keyId,
      await importSPKI(decodePem(this.config.get('JWT_PUBLIC_KEY', { infer: true })), 'EdDSA'),
    );

    // Two active public keys, so key rotation has no downtime (§3.3.4).
    const previousKey = this.config.get('JWT_PREVIOUS_PUBLIC_KEY', { infer: true });
    const previousKeyId = this.config.get('JWT_PREVIOUS_KEY_ID', { infer: true });
    if (previousKey && previousKeyId) {
      this.verifyKeys.set(previousKeyId, await importSPKI(decodePem(previousKey), 'EdDSA'));
    }
  }

  async issueAccessToken(input: {
    userId: string;
    sid: string;
    roleVersion: number;
    role: Role;
  }): Promise<IssuedAccessToken> {
    const expiresIn = SESSION_POLICY[input.role].accessTtlSeconds;
    const now = Math.floor(Date.now() / 1000);

    const accessToken = await new SignJWT({ sid: input.sid, rv: input.roleVersion, role: input.role })
      .setProtectedHeader({ alg: 'EdDSA', kid: this.keyId })
      .setIssuer(this.config.get('JWT_ISSUER', { infer: true }))
      .setAudience(this.config.get('JWT_AUDIENCE', { infer: true }))
      .setSubject(input.userId)
      .setIssuedAt(now)
      .setExpirationTime(now + expiresIn)
      .setJti(randomUUID())
      .sign(this.signingKey);

    return { accessToken, expiresIn };
  }

  /** Verifies signature, algorithm (EdDSA only), issuer, audience and expiry. */
  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
      const { payload } = await jwtVerify(
        token,
        async (header) => {
          const key = header.kid ? this.verifyKeys.get(header.kid) : undefined;
          if (!key) throw new Error('Unknown key id');
          return key;
        },
        {
          algorithms: ['EdDSA'],
          issuer: this.config.get('JWT_ISSUER', { infer: true }),
          audience: this.config.get('JWT_AUDIENCE', { infer: true }),
        },
      );

      const { sub, sid, rv, role, jti, iat, exp } = payload as Record<string, unknown>;
      if (
        typeof sub !== 'string' ||
        typeof sid !== 'string' ||
        typeof rv !== 'number' ||
        typeof role !== 'string' ||
        !ALL_ROLES.includes(role as Role) ||
        typeof jti !== 'string' ||
        typeof iat !== 'number' ||
        typeof exp !== 'number'
      ) {
        throw new Error('Malformed claims');
      }
      return { sub, sid, rv, role: role as Role, jti, iat, exp };
    } catch {
      throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired token', 401);
    }
  }

  /** Opaque 256-bit refresh token. Only its SHA-256 hash is stored. */
  generateRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: this.hashRefreshToken(token) };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}