import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UserStatus } from '../../users/schema/user.schema.js';
import { CredentialType } from '../schema/user-credential.schema.js';
import { AuthService, type LoginInput } from './auth.service.js';

const farmer = {
  id: '64b0000000000000000000aa',
  roles: [Role.FARMER],
  status: UserStatus.ACTIVE,
  roleVersion: 3,
};

const staff = {
  id: '64b0000000000000000000bb',
  roles: [Role.LOCAL_ADMIN],
  status: UserStatus.ACTIVE,
  roleVersion: 1,
};

function loginInput(overrides: Partial<LoginInput> = {}): LoginInput {
  return {
    phone: '0911234567',
    pin: '048215',
    deviceId: 'device-1',
    ip: '203.0.113.4',
    ...overrides,
  };
}

describe('AuthService', () => {
  const users = {
    findByPhone: vi.fn(),
    findByIdentifier: vi.fn(),
    getAuthState: vi.fn(),
    setStatus: vi.fn(),
    markLogin: vi.fn(),
  };
  const credentials = {
    verifySecret: vi.fn(),
    burnVerification: vi.fn(),
    mustChange: vi.fn(),
  };
  const sessions = {
    create: vi.fn(),
    rotate: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllForUser: vi.fn(),
  };
  const tokens = {
    issueAccessToken: vi.fn(),
    verifyAccessToken: vi.fn(),
  };
  const lockout = {
    evaluate: vi.fn(),
    recordFailure: vi.fn(),
    recordSuccess: vi.fn(),
  };
  const devices = { isTrusted: vi.fn(), trust: vi.fn() };
  const otp = { issue: vi.fn() };
  const totp = {};
  const connection = {
    startSession: vi.fn(),
  };
  const config = { get: vi.fn(() => 'pepper-pepper-pepper-pepper-pepper') };

  const service = new AuthService(
    users as never,
    credentials as never,
    sessions as never,
    tokens as never,
    lockout as never,
    devices as never,
    otp as never,
    totp as never,
    connection as never,
    config as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    lockout.evaluate.mockResolvedValue({
      ipBlocked: false,
      accountBlocked: false,
    });
    credentials.verifySecret.mockResolvedValue(true);
    credentials.burnVerification.mockResolvedValue(undefined);
    credentials.mustChange.mockResolvedValue(false);
    devices.isTrusted.mockResolvedValue(true);
    otp.issue.mockResolvedValue({ id: 'ch-1', code: '000000' });
    lockout.recordFailure.mockResolvedValue(1);
    lockout.recordSuccess.mockResolvedValue(undefined);
    users.markLogin.mockResolvedValue(undefined);
    sessions.create.mockResolvedValue({
      sid: 'sid-1',
      role: Role.FARMER,
      refreshToken: 'refresh-1',
      refreshExpiresAt: new Date('2026-11-21T00:00:00.000Z'),
    });
    tokens.issueAccessToken.mockResolvedValue({
      accessToken: 'access-1',
      expiresIn: 900,
    });
  });

  it('opens a session for an active farmer with the correct PIN', async () => {
    users.findByPhone.mockResolvedValue(farmer);

    const result = await service.login(loginInput());

    expect(credentials.verifySecret).toHaveBeenCalledWith(
      farmer.id,
      CredentialType.PIN,
      '048215',
    );
    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: farmer.id,
        deviceId: 'device-1',
        authMethod: 'pin',
      }),
    );
    expect(tokens.issueAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: farmer.id,
        sid: 'sid-1',
        roleVersion: 3,
        role: Role.FARMER,
      }),
    );
    expect(users.markLogin).toHaveBeenCalledWith(farmer.id);
    expect(result).toMatchObject({
      accessToken: 'access-1',
      expiresIn: 900,
      refreshToken: 'refresh-1',
    });
    expect('csrfToken' in result && result.csrfToken).toEqual(
      expect.any(String),
    );
  });

  it('burns a dummy hash and does not open a session for an unknown phone', async () => {
    users.findByPhone.mockResolvedValue(null);
    lockout.recordFailure.mockResolvedValue(1);

    await expect(service.login(loginInput())).rejects.toMatchObject({
      code: ErrorCode.UNAUTHENTICATED,
    });

    expect(credentials.burnVerification).toHaveBeenCalledWith('048215');
    expect(credentials.verifySecret).not.toHaveBeenCalled();
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('records a failure and skips the session when the PIN is wrong', async () => {
    users.findByPhone.mockResolvedValue(farmer);
    credentials.verifySecret.mockResolvedValue(false);

    await expect(service.login(loginInput())).rejects.toBeInstanceOf(
      AppException,
    );
    expect(lockout.recordFailure).toHaveBeenCalled();
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('locks the account on the twentieth consecutive failure', async () => {
    users.findByPhone.mockResolvedValue(farmer);
    credentials.verifySecret.mockResolvedValue(false);
    lockout.recordFailure.mockResolvedValue(20);
    const tx = {
      withTransaction: vi.fn(async (fn: () => Promise<void>) => fn()),
      endSession: vi.fn(),
    };
    connection.startSession.mockResolvedValue(tx);

    await expect(service.login(loginInput())).rejects.toMatchObject({
      code: ErrorCode.TOO_MANY_REQUESTS,
    });
    expect(users.setStatus).toHaveBeenCalledWith(
      farmer.id,
      UserStatus.LOCKED,
      tx,
    );
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(
      farmer.id,
      'ACCOUNT_LOCKED',
      { session: tx },
    );
  });

  it('does not open a session when the account is already locked', async () => {
    users.findByPhone.mockResolvedValue({
      ...farmer,
      status: UserStatus.LOCKED,
    });
    lockout.evaluate.mockResolvedValue({
      ipBlocked: false,
      accountBlocked: true,
    });

    await expect(service.login(loginInput())).rejects.toMatchObject({
      code: ErrorCode.TOO_MANY_REQUESTS,
    });
    expect(credentials.verifySecret).toHaveBeenCalled();
    expect(sessions.create).not.toHaveBeenCalled();
    expect(lockout.recordFailure).not.toHaveBeenCalled();
  });

  it('stops an IP that is over the hourly limit before hashing', async () => {
    users.findByPhone.mockResolvedValue(farmer);
    lockout.evaluate.mockResolvedValue({
      ipBlocked: true,
      accountBlocked: false,
    });

    await expect(service.login(loginInput())).rejects.toMatchObject({
      code: ErrorCode.TOO_MANY_REQUESTS,
    });
    expect(credentials.verifySecret).not.toHaveBeenCalled();
    expect(credentials.burnVerification).not.toHaveBeenCalled();
  });

  it('returns MFA required for a correct staff password and does not open a session', async () => {
    users.findByIdentifier.mockResolvedValue(staff);

    const result = await service.login(
      loginInput({
        phone: undefined,
        pin: undefined,
        identifier: 'admin@example.com',
        password: 'Tractor-Mango-Lake',
      }),
    );

    expect(result).toEqual({
      mfaRequired: true,
      mfaMethods: ['totp'],
      challengeId: 'ch-1',
      totpEnrollRequired: true,
      passwordChangeRequired: false,
    });
    expect(credentials.verifySecret).toHaveBeenCalledWith(
      staff.id,
      CredentialType.PASSWORD,
      'Tractor-Mango-Lake',
    );
    expect(sessions.create).not.toHaveBeenCalled();
    expect(lockout.recordSuccess).not.toHaveBeenCalled();
  });

  it('does not open a session for an inactive farmer', async () => {
    users.findByPhone.mockResolvedValue({
      ...farmer,
      status: UserStatus.SUSPENDED,
    });

    await expect(service.login(loginInput())).rejects.toMatchObject({
      code: ErrorCode.UNAUTHENTICATED,
    });
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('rejects a body that mixes PIN and password fields', async () => {
    await expect(
      service.login(
        loginInput({
          identifier: 'admin@example.com',
          password: 'Tractor-Mango-Lake',
        }),
      ),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    expect(lockout.evaluate).not.toHaveBeenCalled();
  });

  it('issues a new access token on refresh when the user is active', async () => {
    sessions.rotate.mockResolvedValue({
      sid: 'sid-1',
      userId: farmer.id,
      role: Role.FARMER,
      refreshToken: 'refresh-2',
      refreshExpiresAt: new Date('2026-11-21T00:00:00.000Z'),
    });
    users.getAuthState.mockResolvedValue({
      userId: farmer.id,
      status: UserStatus.ACTIVE,
      roles: [Role.FARMER],
      roleVersion: 4,
    });

    const result = await service.refresh('refresh-1');

    expect(tokens.issueAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        sid: 'sid-1',
        roleVersion: 4,
        role: Role.FARMER,
      }),
    );
    expect(result.refreshToken).toBe('refresh-2');
  });

  it('revokes the rotated session when the user is no longer active', async () => {
    sessions.rotate.mockResolvedValue({
      sid: 'sid-1',
      userId: farmer.id,
      role: Role.FARMER,
      refreshToken: 'refresh-2',
      refreshExpiresAt: new Date(),
    });
    users.getAuthState.mockResolvedValue({
      userId: farmer.id,
      status: UserStatus.SUSPENDED,
      roles: [Role.FARMER],
      roleVersion: 4,
    });

    await expect(service.refresh('refresh-1')).rejects.toMatchObject({
      code: ErrorCode.UNAUTHENTICATED,
    });
    expect(sessions.revokeSession).toHaveBeenCalledWith(
      'sid-1',
      'USER_NOT_ACTIVE',
    );
    expect(tokens.issueAccessToken).not.toHaveBeenCalled();
  });

  it('asks for an OTP when the farmer device is not trusted', async () => {
    users.findByPhone.mockResolvedValue(farmer);
    devices.isTrusted.mockResolvedValue(false);

    const result = await service.login(loginInput());

    expect(result).toEqual({ otpRequired: true, challengeId: 'ch-1' });
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('revokes the current session on logout and every session on logout-all', async () => {
    await service.logout('sid-1');
    await service.logoutAll(farmer.id);

    expect(sessions.revokeSession).toHaveBeenCalledWith('sid-1', 'LOGOUT');
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(farmer.id, 'LOGOUT_ALL');
  });
});
