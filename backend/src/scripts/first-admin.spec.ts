import { Role } from '../common/enums/role.enum.js';
import { checkPassword } from '../auth/service/credential.service.js';
import { assertNoNationalAdmin, oneTimePassword, readSeedEmail, readSeedName } from './first-admin.js';

describe('first national admin seed', () => {
  it('refuses to run when a national admin already exists', () => {
    expect(() => assertNoNationalAdmin(1)).toThrow(/already exists/);
    expect(() => assertNoNationalAdmin(0)).not.toThrow();
  });

  it('prints a password a national admin is allowed to use once', () => {
    const password = oneTimePassword();
    expect(password.length).toBe(20);
    expect(checkPassword(password, Role.NATIONAL_ADMIN)).toBeNull();
  });

  it('requires an email and keeps a default name', () => {
    expect(readSeedEmail(['--email', ' Admin@Example.com '])).toBe('admin@example.com');
    expect(() => readSeedEmail([])).toThrow(/--email/);
    expect(readSeedName([])).toBe('National Admin');
    expect(readSeedName(['--name', 'Abebe Bekele'])).toBe('Abebe Bekele');
  });
});
