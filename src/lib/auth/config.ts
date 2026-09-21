/**
 * Authentication configuration.
 * Secrets are read from environment variables — never hard-coded.
 */

export const AUTH_COOKIE_NAME = 'bme_session';
export const CSRF_COOKIE_NAME = 'bme_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours
export const SESSION_REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const EMAIL_VERIFY_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
export const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60; // 1 hour
export const EMAIL_CHANGE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export const LOGIN_WINDOW_MS = 1000 * 60 * 15; // 15 minutes
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MS = 1000 * 60 * 15; // 15 minutes

export const FORGOT_PASSWORD_WINDOW_MS = 1000 * 60 * 60; // 1 hour
export const FORGOT_PASSWORD_MAX_ATTEMPTS = 3;

export const REGISTER_WINDOW_MS = 1000 * 60 * 60;
export const REGISTER_MAX_ATTEMPTS = 8;

export const RESEND_VERIFY_WINDOW_MS = 1000 * 60 * 10;
export const RESEND_VERIFY_MAX_ATTEMPTS = 3;

export const BCRYPT_ROUNDS = 12;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PRIVILEGED_ROLE_SLUGS = [
  'super_admin',
  'admin',
  'finance',
] as const;

export const ADMIN_ASSIGNABLE_BY_ADMIN = [
  'pastor',
  'church_leader',
  'ministry_leader',
  'media_team',
  'prayer_team',
  'finance',
  'member',
] as const;

export const ADMIN_PORTAL_ROLES = [
  'super_admin',
  'admin',
  'pastor',
  'church_leader',
  'ministry_leader',
  'volunteer_coordinator',
  'media_team',
  'prayer_team',
  'finance',
] as const;

function requiredInProduction(name: string, fallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set in production`);
  }
  return fallback;
}

export function getAuthSecret(): string {
  return requiredInProduction(
    'AUTH_SECRET',
    'dev-only-auth-secret-not-for-production'
  );
}

export function getAppUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
}

export function getEmailFrom(): string {
  return (
    process.env.EMAIL_FROM ||
    'Busa Mekene Eyasus Church <noreply@localhost>'
  );
}

export function getEmailBackend(): 'console' | 'smtp' {
  return process.env.EMAIL_BACKEND === 'smtp' ? 'smtp' : 'console';
}

export function getTrustedOrigins(): string[] {
  const raw =
    process.env.CSRF_TRUSTED_ORIGINS ||
    process.env.CORS_ALLOWED_ORIGINS ||
    getAppUrl();
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getCorsAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS || getAppUrl();
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isSecureCookie(): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  const appUrl = process.env.APP_URL || getAppUrl();
  if (appUrl.startsWith('http://')) return false;
  return process.env.NODE_ENV === 'production';
}
