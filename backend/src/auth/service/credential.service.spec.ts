import { Role } from '../../common/enums/role.enum.js';
import { checkPassword, checkPin } from './credential.service.js';

describe('checkPin', () => {
  it.each(['048215', '729306', '358140'])('accepts %s', (pin) => {
    expect(checkPin(pin)).toBeNull();
  });

  it.each(['000000', '123456', '111111', '654321', '121212', '123123', '19901', 'abcdef', '1990xy'])(
    'rejects %s',
    (pin) => {
      expect(checkPin(pin)).not.toBeNull();
    },
  );

  it('rejects year-like PINs', () => {
    expect(checkPin('199043')).not.toBeNull();
    expect(checkPin('431990')).not.toBeNull();
  });

  it('rejects the last six digits of the phone number', () => {
    expect(checkPin('048215', { phone: '+251910048215' })).not.toBeNull();
  });
});

describe('checkPassword', () => {
  it('enforces minimum length by role', () => {
    expect(checkPassword('Tractor-Mango-Lake', Role.LOCAL_ADMIN)).toBeNull();
    expect(checkPassword('short-pass', Role.LOCAL_ADMIN)).not.toBeNull();
    expect(checkPassword('twelve-chars1', Role.NATIONAL_ADMIN)).not.toBeNull();
    expect(checkPassword('fourteen-chars-ok', Role.NATIONAL_ADMIN)).toBeNull();
  });

  it('rejects common passwords and repeated characters', () => {
    expect(checkPassword('administrator1', Role.REGIONAL_ADMIN)).not.toBeNull();
    expect(checkPassword('aaaaaaaaaaaaaaaa', Role.REGIONAL_ADMIN)).not.toBeNull();
  });

  it('rejects passwords containing the name or phone', () => {
    const ctx = { fullName: 'Abebe Kebede', phone: '+251911234567' };
    expect(checkPassword('abebe-loves-coffee', Role.LOCAL_ADMIN, ctx)).not.toBeNull();
    expect(checkPassword('call-1234567-now-ok', Role.LOCAL_ADMIN, ctx)).not.toBeNull();
  });

  it('rejects passwords for farmers', () => {
    expect(checkPassword('Tractor-Mango-Lake', Role.FARMER)).not.toBeNull();
  });
});