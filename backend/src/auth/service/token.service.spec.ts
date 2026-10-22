import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose';
import { Role } from '../../common/enums/role.enum.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { AppException } from '../../common/errors/app.exception.js';
import { TokenService, primaryRole, SESSION_POLICY } from './token.service.js';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal ConfigService stub from a plain key/value record. */
function makeConfig(overrides: Record<string, string> = {}) {
  return {
    get: (key: string) => {
      const map: Record<string, string> = {
        JWT_ISSUER: 'agrotrust-test',
        JWT_AUDIENCE: 'agrotrust-api',
        JWT_KEY_ID: 'key-1',
        JWT_PREVIOUS_PUBLIC_KEY: '',
        JWT_PREVIOUS_KEY_ID: '',
        ...overrides,
      };
      return map[key];
    },
  } as never;
}

// ── primaryRole ───────────────────────────────────────────────────────────────

describe('primaryRole', () => {
  it('returns the most privileged role when multiple are present', () => {
    expect(primaryRole([Role.FARMER, Role.LOCAL_ADMIN, Role.NATIONAL_ADMIN])).toBe(
      Role.NATIONAL_ADMIN,
    );
  });

  it('handles a single role correctly', () => {
    expect(primaryRole([Role.AUDITOR])).toBe(Role.AUDITOR);
    expect(primaryRole([Role.FARMER])).toBe(Role.FARMER);
  });

  it('throws when the array is empty', () => {
    expect(() => primaryRole([])).toThrow('User has no valid role');
  });

  it('respects the full priority order', () => {
    const priority = [
      Role.NATIONAL_ADMIN,
      Role.REGIONAL_ADMIN,
      Role.AUDITOR,
      Role.LOCAL_ADMIN,
      Role.DISTRIBUTOR_STAFF,
      Role.FARMER,
    ];
    for (let i = 0; i < priority.length; i++) {
      expect(primaryRole(priority.slice(i))).toBe(priority[i]);
    }
  });
});

// ── SESSION_POLICY ────────────────────────────────────────────────────────────

describe('SESSION_POLICY', () => {
  it('covers every role', () => {
    for (const role of Object.values(Role)) {
      expect(SESSION_POLICY[role]).toBeDefined();
    }
  });

  it('farmers have longer idle and absolute limits than staff', () => {
    expect(SESSION_POLICY[Role.FARMER].idleSeconds).toBeGreaterThan(
      SESSION_POLICY[Role.LOCAL_ADMIN].idleSeconds,
    );
    expect(SESSION_POLICY[Role.FARMER].absoluteSeconds).toBeGreaterThan(
      SESSION_POLICY[Role.NATIONAL_ADMIN].absoluteSeconds,
    );
  });

  it('all TTL values are positive numbers', () => {
    for (const policy of Object.values(SESSION_POLICY)) {
      expect(policy.accessTtlSeconds).toBeGreaterThan(0);
      expect(policy.idleSeconds).toBeGreaterThan(0);
      expect(policy.absoluteSeconds).toBeGreaterThan(0);
    }
  });
});

// ── refresh-token helpers ─────────────────────────────────────────────────────

describe('generateRefreshToken / hashRefreshToken', () => {
  let service: TokenService;

  beforeEach(() => {
    service = new TokenService(makeConfig());
  });

  it('produces a base64url token of adequate entropy (≥ 32 bytes)', () => {
    const { token } = service.generateRefreshToken();
    const bytes = Buffer.from(token, 'base64url');
    expect(bytes.byteLength).toBeGreaterThanOrEqual(32);
  });

  it('token and hash are different strings', () => {
    const { token, hash } = service.generateRefreshToken();
    expect(token).not.toBe(hash);
  });

  it('hash is a valid hex SHA-256 digest (64 chars)', () => {
    const { hash } = service.generateRefreshToken();
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('same token always produces the same hash', () => {
    const { token } = service.generateRefreshToken();
    expect(service.hashRefreshToken(token)).toBe(service.hashRefreshToken(token));
  });

  it('different tokens produce different hashes', () => {
    const a = service.generateRefreshToken();
    const b = service.generateRefreshToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).not.toBe(b.hash);
  });

  it('hashRefreshToken is deterministic for a known input', () => {
    // SHA-256("test") in hex
    const expected = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
    expect(service.hashRefreshToken('test')).toBe(expected);
  });
});

// ── JWT issue / verify ────────────────────────────────────────────────────────

describe('TokenService JWT', () => {
  let service: TokenService;
  let privateKeyPem: string;
  let publicKeyPem: string;

  const USER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const SESSION_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

  beforeAll(async () => {
    const { privateKey, publicKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519', extractable: true });
    privateKeyPem = Buffer.from(await exportPKCS8(privateKey)).toString('base64');
    publicKeyPem = Buffer.from(await exportSPKI(publicKey)).toString('base64');
  });

  beforeEach(async () => {
    service = new TokenService(
      makeConfig({
        JWT_PRIVATE_KEY: privateKeyPem,
        JWT_PUBLIC_KEY: publicKeyPem,
      }),
    );
    await service.onModuleInit();
  });

  it('issues and verifies a valid access token for each role', async () => {
    for (const role of Object.values(Role)) {
      const { accessToken, expiresIn } = await service.issueAccessToken({
        userId: USER_ID,
        sid: SESSION_ID,
        roleVersion: 1,
        role,
      });

      expect(typeof accessToken).toBe('string');
      expect(expiresIn).toBe(SESSION_POLICY[role].accessTtlSeconds);

      const claims = await service.verifyAccessToken(accessToken);
      expect(claims.sub).toBe(USER_ID);
      expect(claims.sid).toBe(SESSION_ID);
      expect(claims.role).toBe(role);
      expect(claims.rv).toBe(1);
      expect(typeof claims.jti).toBe('string');
      expect(typeof claims.iat).toBe('number');
      expect(typeof claims.exp).toBe('number');
    }
  });

  it('each issued token has a unique jti', async () => {
    const input = { userId: USER_ID, sid: SESSION_ID, roleVersion: 1, role: Role.FARMER };
    const a = await service.issueAccessToken(input);
    const b = await service.issueAccessToken(input);
    const [ca, cb] = await Promise.all([
      service.verifyAccessToken(a.accessToken),
      service.verifyAccessToken(b.accessToken),
    ]);
    expect(ca.jti).not.toBe(cb.jti);
  });

  it('rejects a tampered token with UNAUTHENTICATED', async () => {
    const { accessToken } = await service.issueAccessToken({
      userId: USER_ID,
      sid: SESSION_ID,
      roleVersion: 1,
      role: Role.FARMER,
    });
    // Flip one character in the signature segment
    const parts = accessToken.split('.');
    parts[2] = parts[2]!.split('').reverse().join('');
    const tampered = parts.join('.');

    await expect(service.verifyAccessToken(tampered)).rejects.toMatchObject({
      code: ErrorCode.UNAUTHENTICATED,
    });
  });

  it('rejects a completely invalid string', async () => {
    await expect(service.verifyAccessToken('not.a.jwt')).rejects.toBeInstanceOf(AppException);
  });

  it('rejects a token signed with a different key', async () => {
    // Generate a second keypair and sign with it
    const { privateKey: otherPriv, publicKey: otherPub } = await generateKeyPair('EdDSA', {
      crv: 'Ed25519',
      extractable: true,
    });
    const otherPrivPem = Buffer.from(await exportPKCS8(otherPriv)).toString('base64');
    const otherPubPem = Buffer.from(await exportSPKI(otherPub)).toString('base64');

    const otherService = new TokenService(
      makeConfig({
        JWT_PRIVATE_KEY: otherPrivPem,
        JWT_PUBLIC_KEY: otherPubPem,
      }),
    );
    await otherService.onModuleInit();

    const { accessToken } = await otherService.issueAccessToken({
      userId: USER_ID,
      sid: SESSION_ID,
      roleVersion: 1,
      role: Role.FARMER,
    });

    // Verify with the original service (different public key → should fail)
    await expect(service.verifyAccessToken(accessToken)).rejects.toBeInstanceOf(AppException);
  });
});

// ── key rotation (previous key) ───────────────────────────────────────────────

describe('TokenService key rotation', () => {
  it('verifies tokens signed by the previous key', async () => {
    // Create two keypairs: "old" and "new"
    const { privateKey: oldPriv, publicKey: oldPub } = await generateKeyPair('EdDSA', {
      crv: 'Ed25519',
      extractable: true,
    });
    const { privateKey: newPriv, publicKey: newPub } = await generateKeyPair('EdDSA', {
      crv: 'Ed25519',
      extractable: true,
    });

    const oldPrivPem = Buffer.from(await exportPKCS8(oldPriv)).toString('base64');
    const oldPubPem = Buffer.from(await exportSPKI(oldPub)).toString('base64');
    const newPrivPem = Buffer.from(await exportPKCS8(newPriv)).toString('base64');
    const newPubPem = Buffer.from(await exportSPKI(newPub)).toString('base64');

    // Service with the OLD key — issues a token
    const oldService = new TokenService(
      makeConfig({ JWT_PRIVATE_KEY: oldPrivPem, JWT_PUBLIC_KEY: oldPubPem }),
    );
    await oldService.onModuleInit();

    const { accessToken: oldToken } = await oldService.issueAccessToken({
      userId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      sid: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      roleVersion: 1,
      role: Role.LOCAL_ADMIN,
    });

    // Service rotated to NEW key, with OLD key as "previous"
    const rotatedService = new TokenService(
      makeConfig({
        JWT_KEY_ID: 'key-2',
        JWT_PRIVATE_KEY: newPrivPem,
        JWT_PUBLIC_KEY: newPubPem,
        JWT_PREVIOUS_KEY_ID: 'key-1',
        JWT_PREVIOUS_PUBLIC_KEY: oldPubPem,
      }),
    );
    await rotatedService.onModuleInit();

    // Old token must still verify against the rotated service
    const claims = await rotatedService.verifyAccessToken(oldToken);
    expect(claims.role).toBe(Role.LOCAL_ADMIN);

    // New tokens also work
    const { accessToken: newToken } = await rotatedService.issueAccessToken({
      userId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      sid: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      roleVersion: 2,
      role: Role.LOCAL_ADMIN,
    });
    const newClaims = await rotatedService.verifyAccessToken(newToken);
    expect(newClaims.rv).toBe(2);
  });
});
