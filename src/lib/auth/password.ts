import bcrypt from 'bcryptjs';
import {
  BCRYPT_ROUNDS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './config';

const COMMON_PASSWORDS = new Set(
  [
    'password',
    'password1',
    'password123',
    '12345678',
    '123456789',
    'qwerty123',
    'qwertyui',
    'letmein1',
    'welcome1',
    'church123',
    'jesus123',
    'admin123',
    'iloveyou',
    'abc12345',
    '11111111',
    '00000000',
  ].map((p) => p.toLowerCase())
);

export interface PasswordPolicyResult {
  ok: boolean;
  errors: string[];
}

export function validatePasswordPolicy(
  password: string,
  extras: { email?: string; firstName?: string; lastName?: string } = {}
): PasswordPolicyResult {
  const errors: string[] = [];

  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must be at most ${PASSWORD_MAX_LENGTH} characters.`);
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger password.');
  }
  if (/^\s|\s$/.test(password)) {
    errors.push('Password cannot start or end with a space.');
  }

  const lowered = password.toLowerCase();
  const emailLocal = extras.email?.split('@')[0]?.toLowerCase();
  if (emailLocal && emailLocal.length >= 4 && lowered.includes(emailLocal)) {
    errors.push('Password should not contain your email address.');
  }
  if (extras.firstName && extras.firstName.length >= 3 && lowered.includes(extras.firstName.toLowerCase())) {
    errors.push('Password should not contain your first name.');
  }
  if (extras.lastName && extras.lastName.length >= 3 && lowered.includes(extras.lastName.toLowerCase())) {
    errors.push('Password should not contain your last name.');
  }

  return { ok: errors.length === 0, errors };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}

/** Dummy compare to reduce timing differences when an account does not exist. */
export async function dummyPasswordCheck(): Promise<void> {
  await bcrypt.compare(
    'not-the-password',
    '$2a$12$C6UzMDM.H6dfI/f/IKcEeOQbYk3qQ5n5n5n5n5n5n5n5n5n5n5n5u'
  );
}
