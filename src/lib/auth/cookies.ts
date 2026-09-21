import type { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  isSecureCookie,
} from './config';

export function parseCookieHeader(
  header: string | null,
  name: string
): string | undefined {
  if (!header) return undefined;
  const parts = header.split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

export function getRequestCookie(request: Request, name: string): string | undefined {
  return parseCookieHeader(request.headers.get('cookie'), name);
}

export function getSessionTokenFromRequest(request: Request): string | undefined {
  return getRequestCookie(request, AUTH_COOKIE_NAME);
}

export function cookieBaseOptions() {
  return {
    path: '/',
    sameSite: 'lax' as const,
    secure: isSecureCookie(),
  };
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  maxAgeSeconds: number
) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    ...cookieBaseOptions(),
    httpOnly: true,
    maxAge: maxAgeSeconds,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    ...cookieBaseOptions(),
    httpOnly: true,
    maxAge: 0,
  });
}

export function setCsrfCookie(response: NextResponse, token: string) {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    ...cookieBaseOptions(),
    httpOnly: false,
    maxAge: 60 * 60 * 24,
  });
}
