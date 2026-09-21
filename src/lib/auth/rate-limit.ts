import {
  FORGOT_PASSWORD_MAX_ATTEMPTS,
  FORGOT_PASSWORD_WINDOW_MS,
  LOGIN_LOCKOUT_MS,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  REGISTER_MAX_ATTEMPTS,
  REGISTER_WINDOW_MS,
  RESEND_VERIFY_MAX_ATTEMPTS,
  RESEND_VERIFY_WINDOW_MS,
} from './config';

interface Bucket {
  count: number;
  windowStart: number;
  lockedUntil?: number;
}

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    const ttl = Math.max(
      LOGIN_WINDOW_MS,
      FORGOT_PASSWORD_WINDOW_MS,
      REGISTER_WINDOW_MS
    );
    if (now - bucket.windowStart > ttl && (!bucket.lockedUntil || bucket.lockedUntil < now)) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

function hit(
  key: string,
  max: number,
  windowMs: number,
  lockMs = 0
): RateLimitResult {
  const now = Date.now();
  prune(now);
  const existing = buckets.get(key);

  if (existing?.lockedUntil && existing.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.lockedUntil - now) / 1000),
    };
  }

  if (!existing || now - existing.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > max) {
    if (lockMs > 0) {
      existing.lockedUntil = now + lockMs;
      return { allowed: false, retryAfterSeconds: Math.ceil(lockMs / 1000) };
    }
    const retry = Math.ceil((existing.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(retry, 1) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function rateLimitLogin(email: string, ip: string): RateLimitResult {
  const emailKey = `login:email:${email.toLowerCase()}`;
  const ipKey = `login:ip:${ip}`;
  const byEmail = hit(emailKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS, LOGIN_LOCKOUT_MS);
  if (!byEmail.allowed) return byEmail;
  return hit(ipKey, LOGIN_MAX_ATTEMPTS * 3, LOGIN_WINDOW_MS, LOGIN_LOCKOUT_MS);
}

export function clearLoginRateLimit(email: string) {
  buckets.delete(`login:email:${email.toLowerCase()}`);
}

export function rateLimitForgotPassword(email: string, ip: string): RateLimitResult {
  const a = hit(
    `forgot:email:${email.toLowerCase()}`,
    FORGOT_PASSWORD_MAX_ATTEMPTS,
    FORGOT_PASSWORD_WINDOW_MS
  );
  if (!a.allowed) return a;
  return hit(`forgot:ip:${ip}`, FORGOT_PASSWORD_MAX_ATTEMPTS * 3, FORGOT_PASSWORD_WINDOW_MS);
}

export function rateLimitRegister(ip: string): RateLimitResult {
  return hit(`register:ip:${ip}`, REGISTER_MAX_ATTEMPTS, REGISTER_WINDOW_MS);
}

export function rateLimitResendVerification(email: string, ip: string): RateLimitResult {
  const a = hit(
    `resend:${email.toLowerCase()}`,
    RESEND_VERIFY_MAX_ATTEMPTS,
    RESEND_VERIFY_WINDOW_MS
  );
  if (!a.allowed) return a;
  return hit(`resend:ip:${ip}`, RESEND_VERIFY_MAX_ATTEMPTS * 3, RESEND_VERIFY_WINDOW_MS);
}

export function rateLimitKey(key: string, max: number, windowMs: number): RateLimitResult {
  return hit(key, max, windowMs);
}

export function resetRateLimitStore() {
  buckets.clear();
}
