import { randomBytes } from 'node:crypto';
import { Role } from '../common/enums/role.enum.js';
import { checkPassword } from '../auth/service/credential.service.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function assertNoNationalAdmin(count: number): void {
  if (count > 0) {
    throw new Error('A national admin already exists');
  }
}

export function oneTimePassword(): string {
  const bytes = randomBytes(20);
  let password = '';
  for (const byte of bytes) password += ALPHABET[byte % ALPHABET.length];
  const problem = checkPassword(password, Role.NATIONAL_ADMIN);
  if (problem) throw new Error(problem);
  return password;
}

export function readSeedEmail(argv: string[]): string {
  const index = argv.indexOf('--email');
  const email = index >= 0 ? argv[index + 1]?.trim().toLowerCase() : undefined;
  if (!email || !email.includes('@') || email.startsWith('@') || email.endsWith('@')) {
    throw new Error('Usage: npm run seed:first-admin -- --email you@example.com');
  }
  return email;
}

export function readSeedName(argv: string[]): string {
  const index = argv.indexOf('--name');
  const name = index >= 0 ? argv[index + 1]?.trim() : undefined;
  return name || 'National Admin';
}
