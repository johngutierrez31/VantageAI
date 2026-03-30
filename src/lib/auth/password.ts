import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PASSWORD_KEYLEN = 64;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_PREFIX = 'scrypt';

function normalizePassword(value: string) {
  return value.normalize('NFKC');
}

export function hashPassword(password: string) {
  const salt = randomBytes(PASSWORD_SALT_BYTES).toString('hex');
  const derived = scryptSync(normalizePassword(password), salt, PASSWORD_KEYLEN).toString('hex');
  return `${PASSWORD_PREFIX}:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [prefix, salt, expectedHex] = storedHash.split(':');
  if (prefix !== PASSWORD_PREFIX || !salt || !expectedHex) return false;

  const actualHex = scryptSync(normalizePassword(password), salt, PASSWORD_KEYLEN).toString('hex');
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = Buffer.from(actualHex, 'hex');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
