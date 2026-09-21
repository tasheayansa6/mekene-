import { createHmac, timingSafeEqual } from 'crypto';
import { getAuthSecret } from '@/lib/auth/config';
import { enqueueMediaJob, buildJobIdempotencyKey } from '@/lib/library/jobs';

const DEFAULT_TTL_SECONDS = 15 * 60;

function signingSecret(): string {
  return process.env.MEDIA_SIGNING_SECRET?.trim() || getAuthSecret();
}

export function createSignedMediaToken(input: {
  path: string;
  userId?: string | null;
  ttlSeconds?: number;
}): { token: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + (input.ttlSeconds || DEFAULT_TTL_SECONDS);
  const payload = `${input.path}|${input.userId || ''}|${expiresAt}`;
  const sig = createHmac('sha256', signingSecret()).update(payload).digest('hex');
  const token = Buffer.from(`${payload}|${sig}`).toString('base64url');
  return { token, expiresAt };
}

export function verifySignedMediaToken(
  token: string,
  expectedPath: string
): { ok: true; userId: string | null; expiresAt: number } | { ok: false; reason: string } {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const [path, userId, expiresRaw, sig] = raw.split('|');
    if (!path || !expiresRaw || !sig) return { ok: false, reason: 'invalid_token' };
    if (path !== expectedPath) return { ok: false, reason: 'path_mismatch' };
    const expiresAt = Number(expiresRaw);
    if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
      return { ok: false, reason: 'expired' };
    }
    const payload = `${path}|${userId || ''}|${expiresAt}`;
    const expected = createHmac('sha256', signingSecret()).update(payload).digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: 'bad_signature' };
    }
    return { ok: true, userId: userId || null, expiresAt };
  } catch {
    return { ok: false, reason: 'invalid_token' };
  }
}

export const BLOCKED_UPLOAD_EXTENSIONS = new Set([
  'exe',
  'sh',
  'bat',
  'cmd',
  'com',
  'msi',
  'dll',
  'js',
  'mjs',
  'cjs',
  'php',
  'phtml',
  'asp',
  'aspx',
  'cgi',
  'pl',
  'py',
  'rb',
  'jar',
  'ps1',
  'vbs',
  'scr',
]);

export function isBlockedUploadFilename(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return BLOCKED_UPLOAD_EXTENSIONS.has(ext);
}

export { enqueueMediaJob, buildJobIdempotencyKey };

/** @deprecated Use enqueueMediaJob — kept as alias for existing imports. */
export const enqueueMediaJobStub = enqueueMediaJob;
