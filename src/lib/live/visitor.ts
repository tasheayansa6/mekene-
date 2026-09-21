import type { NextResponse } from 'next/server';
import { cookieBaseOptions, getRequestCookie } from '@/lib/auth/cookies';
import { generateToken } from '@/lib/auth/tokens';

export const LIVE_VISITOR_COOKIE = 'bme_live_visitor';

export function getOrCreateVisitorKey(request: Request): { key: string; created: boolean } {
  const existing = getRequestCookie(request, LIVE_VISITOR_COOKIE);
  if (existing && existing.length >= 16) {
    return { key: existing, created: false };
  }
  return { key: generateToken(24), created: true };
}

export function attachLiveVisitorCookie(response: NextResponse, key: string) {
  response.cookies.set(LIVE_VISITOR_COOKIE, key, {
    ...cookieBaseOptions(),
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  });
}
