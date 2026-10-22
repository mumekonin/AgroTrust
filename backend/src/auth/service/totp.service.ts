import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { toDataURL } from 'qrcode';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import type { Env } from '../../config/env.schema.js';
import { CredentialService } from './credential.service.js';

const ISSUER = 'AgroTrust';
const RECOVERY_CODE_COUNT = 10;

export function encryptTotpSecret(secret: string, rawKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(rawKey), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptTotpSecret(payload: string, rawKey: string): string {
  const [iv, tag, encrypted] = payload.split('.');
  if (!iv || !tag || !encrypted) {
    throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyBytes(rawKey),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function hashRecoveryCode(code: string, pepper: string): string {
  return createHmac('sha256', pepper).update(code).digest('hex');
}

export function recoveryCodeMatches(code: string, hash: string, pepper: string): boolean {
  const left = Buffer.from(hashRecoveryCode(code, pepper));
  const right = Buffer.from(hash);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function keyBytes(rawKey: string): Buffer {
  return createHash('sha256').update(rawKey).digest();
}

@Injectable()
export class TotpService {
  private readonly key: string;
  private readonly pepper: string;

  constructor(
    private readonly credentials: CredentialService,
    config: ConfigService<Env, true>,
  ) {
    this.key = config.get('TOTP_ENCRYPTION_KEY', { infer: true });
    this.pepper = config.get('AUTH_PEPPER', { infer: true });
  }

  async enroll(userId: string, label: string): Promise<{ otpauthUri: string; qrDataUrl: string }> {
    const secret = generateSecret();
    await this.credentials.saveTotpSecret(userId, encryptTotpSecret(secret, this.key));
    const otpauthUri = generateURI({ issuer: ISSUER, label, secret });
    const qrDataUrl = await toDataURL(otpauthUri);
    return { otpauthUri, qrDataUrl };
  }

  async confirm(userId: string, code: string): Promise<string[]> {
    const ok = await this.verify(userId, code);
    if (!ok) throw new AppException(ErrorCode.UNAUTHENTICATED, 'Invalid or expired code', 401);
    await this.credentials.confirmTotp(userId);
    return this.replaceRecoveryCodes(userId);
  }

  async verify(userId: string, code: string): Promise<boolean> {
    const stored = await this.credentials.readTotpSecret(userId);
    if (!stored) return false;
    const secret = decryptTotpSecret(stored, this.key);
    const result = verifySync({ secret, token: code, epochTolerance: 30 });
    return result.valid;
  }

  /** Checks every hash so the comparison does not stop early. */
  async useRecoveryCode(userId: string, code: string): Promise<boolean> {
    const hashes = await this.credentials.readRecoveryHashes(userId);
    let matched: string | undefined;
    for (const hash of hashes) {
      if (recoveryCodeMatches(code, hash, this.pepper)) matched = hash;
    }
    if (!matched) return false;
    await this.credentials.consumeRecoveryHash(userId, matched);
    return true;
  }

  private async replaceRecoveryCodes(userId: string): Promise<string[]> {
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
      randomBytes(5).toString('hex'),
    );
    await this.credentials.saveRecoveryCodes(
      userId,
      codes.map((code) => hashRecoveryCode(code, this.pepper)),
    );
    return codes;
  }
}
