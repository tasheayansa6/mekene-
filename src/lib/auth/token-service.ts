import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EMAIL_CHANGE_TTL_MS, EMAIL_VERIFY_TTL_MS, PASSWORD_RESET_TTL_MS } from './config';
import { generateToken, hashToken, isExpired } from './tokens';
import type { AuthTokenType } from '@prisma/client';

export async function issueAuthToken(
  userId: string,
  type: AuthTokenType,
  ttlMs: number
): Promise<string> {
  const token = generateToken(32);
  await db.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
  return token;
}

export async function issueEmailVerificationToken(userId: string): Promise<string> {
  await invalidateUnusedTokens(userId, 'email_verification');
  return issueAuthToken(userId, 'email_verification', EMAIL_VERIFY_TTL_MS);
}

export async function issuePasswordResetToken(userId: string): Promise<string> {
  await invalidateUnusedTokens(userId, 'password_reset');
  return issueAuthToken(userId, 'password_reset', PASSWORD_RESET_TTL_MS);
}

export async function issueEmailChangeToken(userId: string): Promise<string> {
  await invalidateUnusedTokens(userId, 'email_change');
  return issueAuthToken(userId, 'email_change', EMAIL_CHANGE_TTL_MS);
}

export async function consumeAuthToken(
  rawToken: string,
  type: AuthTokenType
): Promise<{ ok: true; userId: string } | { ok: false; reason: 'invalid' | 'expired' | 'used' }> {
  const record = await db.authToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  if (!record || record.type !== type) {
    return { ok: false, reason: 'invalid' };
  }
  if (record.usedAt) {
    return { ok: false, reason: 'used' };
  }
  if (isExpired(record.expiresAt)) {
    return { ok: false, reason: 'expired' };
  }

  await db.authToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { ok: true, userId: record.userId };
}

export async function invalidateUnusedTokens(userId: string, type: AuthTokenType) {
  await db.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
}

export function jsonWithCsrf<T>(
  response: NextResponse<T>,
  csrfToken?: string
): NextResponse<T> {
  if (csrfToken) {
    // cookie is attached by callers via attachCsrfCookie
  }
  return response;
}
