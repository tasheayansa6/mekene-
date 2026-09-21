import { db } from '@/lib/db';

export async function logSecurityEvent(options: {
  action: string;
  entity?: string;
  entityId?: string | null;
  userId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}) {
  const details = options.details ? sanitizeDetails(options.details) : null;

  try {
    await db.auditLog.create({
      data: {
        userId: options.userId ?? null,
        action: options.action,
        entity: options.entity ?? 'auth',
        entityId: options.entityId ?? null,
        details: details ? JSON.stringify(details) : null,
        ipAddress: options.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error('[audit] Failed to write security log', error);
  }
}

const FORBIDDEN_DETAIL_KEYS = [
  'password',
  'passwordHash',
  'token',
  'tokenHash',
  'csrf',
  'session',
  'secret',
  'authorization',
  'guestemail',
  'guestname',
];

function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    const lowered = key.toLowerCase();
    if (FORBIDDEN_DETAIL_KEYS.some((forbidden) => lowered.includes(forbidden))) {
      continue;
    }
    clean[key] = value;
  }
  return clean;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export function getUserAgent(request: Request): string | null {
  return request.headers.get('user-agent');
}
