import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import type { PrayerHookType } from './hooks';

const ALLOWED_DETAIL_KEYS = new Set([
  'status',
  'previousStatus',
  'visibility',
  'assignedToId',
  'publicApproved',
  'categoryId',
  'isAnonymous',
  'guest',
]);

function safeDetails(details?: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!details) return null;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (!ALLOWED_DETAIL_KEYS.has(key)) continue;
    if (value === undefined) continue;
    clean[key] = value;
  }
  return Object.keys(clean).length ? clean : null;
}

export async function logPrayerAudit(options: {
  type: PrayerHookType | 'prayer_request.deleted';
  requestId: string;
  userId?: string | null;
  request?: Request;
  details?: Record<string, unknown> | null;
}) {
  await logSecurityEvent({
    action: options.type,
    entity: 'prayer_request',
    entityId: options.requestId,
    userId: options.userId ?? null,
    ipAddress: options.request ? getClientIp(options.request) : null,
    details: safeDetails(options.details),
  });
}
