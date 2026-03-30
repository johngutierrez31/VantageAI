import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('password auth helpers', () => {
  it('hashes and verifies a password', () => {
    const hash = hashPassword('CorrectHorseBatteryStaple123!');
    expect(hash).toContain('scrypt:');
    expect(verifyPassword('CorrectHorseBatteryStaple123!', hash)).toBe(true);
  });

  it('rejects invalid passwords', () => {
    const hash = hashPassword('CorrectHorseBatteryStaple123!');
    expect(verifyPassword('WrongPassword!', hash)).toBe(false);
  });
});
