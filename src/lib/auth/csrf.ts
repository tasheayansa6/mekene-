import { NextResponse } from 'next/server';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, getTrustedOrigins } from './config';
import { generateToken } from './tokens';
import { getRequestCookie, setCsrfCookie } from './cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function createCsrfToken(): string {
  return generateToken(32);
}

export function attachCsrfCookie(response: NextResponse, token?: string): string {
  const value = token ?? createCsrfToken();
  setCsrfCookie(response, value);
  return value;
}

export function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) {
    // Same-origin navigations and server-side calls may omit Origin.
    const referer = request.headers.get('referer');
    if (!referer) return true;
    try {
      return getTrustedOrigins().some((trusted) => referer.startsWith(trusted));
    } catch {
      return false;
    }
  }
  return getTrustedOrigins().includes(origin);
}

export function validateCsrf(request: Request): { ok: true } | { ok: false; reason: string } {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return { ok: true };
  }

  if (!isTrustedOrigin(request)) {
    return { ok: false, reason: 'Untrusted origin' };
  }

  const cookieToken = getRequestCookie(request, CSRF_COOKIE_NAME);
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return { ok: false, reason: 'CSRF token missing' };
  }
  if (cookieToken.length < 16 || headerToken.length < 16) {
    return { ok: false, reason: 'CSRF token invalid' };
  }
  if (!timingSafeEqual(cookieToken, headerToken)) {
    return { ok: false, reason: 'CSRF token mismatch' };
  }
  return { ok: true };
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
