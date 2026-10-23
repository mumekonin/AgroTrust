import { validateEnv } from './env.schema.js';

const base = {
  MONGODB_URI: 'mongodb://localhost:27017/agrotrust',
  JWT_PRIVATE_KEY: 'private',
  JWT_PUBLIC_KEY: 'public',
  AUTH_PEPPER: 'pepper-pepper-pepper-pepper-pepper-32',
  TOTP_ENCRYPTION_KEY: 'totp-key-totp-key-totp-key-totp-32',
};

describe('validateEnv', () => {
  it('keeps the mock SMS gateway outside production', () => {
    expect(validateEnv(base).SMS_GATEWAY).toBe('mock');
  });

  it('refuses to boot production on the mock gateway', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production', SMS_GATEWAY: 'mock' })).toThrow(
      /SMS_GATEWAY/,
    );
  });

  it('accepts production when the HTTP gateway is configured', () => {
    const env = validateEnv({
      ...base,
      NODE_ENV: 'production',
      SMS_GATEWAY: 'http',
      SMS_GATEWAY_URL: 'https://sms.example/send',
      SMS_GATEWAY_KEY: 'secret',
    });
    expect(env.SMS_SENDER_ID).toBe('AgroTrust');
  });
});
