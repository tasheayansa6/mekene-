import { createHash } from 'crypto';
import type { NextResponse } from 'next/server';
import { cookieBaseOptions, getRequestCookie } from '@/lib/auth/cookies';
import { generateToken } from '@/lib/auth/tokens';
import { getAuthSecret } from '@/lib/auth/config';

export const PRAYER_ACTOR_COOKIE = 'bme_prayer_actor';

export function prayerActorHash(requestId: string, actorToken: string): string {
  return createHash('sha256')
    .update(`${getAuthSecret()}:prayer:${requestId}:${actorToken}`)
    .digest('hex');
}

export function getOrCreateActorToken(request: Request): { token: string; created: boolean } {
  const existing = getRequestCookie(request, PRAYER_ACTOR_COOKIE);
  if (existing && existing.length >= 16) {
    return { token: existing, created: false };
  }
  return { token: generateToken(24), created: true };
}

export function attachPrayerActorCookie(response: NextResponse, token: string) {
  response.cookies.set(PRAYER_ACTOR_COOKIE, token, {
    ...cookieBaseOptions(),
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  });
}
