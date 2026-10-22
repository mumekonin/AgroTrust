import { normalizeEthiopianPhone } from './phone.util.js';

describe('normalizeEthiopianPhone', () => {
  it.each([
    ['0911234567', '+251911234567'],
    ['911234567', '+251911234567'],
    ['251911234567', '+251911234567'],
    ['+251 91 123 4567', '+251911234567'],
    ['0711234567', '+251711234567'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeEthiopianPhone(input)).toBe(expected);
  });

  it.each(['', '12345', '0811234567', '+254711234567', 'abc'])(
    'rejects %s',
    (input) => {
      expect(normalizeEthiopianPhone(input)).toBeNull();
    },
  );
});