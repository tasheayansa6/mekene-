import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';

const SENSITIVE = /password|token|secret|streamUrl|embedUrl|authorization/i;

export async function emitLiveAudit(input: {
  action: string;
  sessionId?: string | null;
  userId?: string | null;
  request?: Request;
  details?: Record<string, unknown>;
}) {
  const details: Record<string, unknown> = { live: input.action };
  if (input.details) {
    for (const [key, value] of Object.entries(input.details)) {
      if (SENSITIVE.test(key)) continue;
      details[key] = value;
    }
  }

  await logSecurityEvent({
    action: input.action,
    entity: 'live_session',
    entityId: input.sessionId ?? undefined,
    userId: input.userId ?? undefined,
    ipAddress: input.request ? getClientIp(input.request) : undefined,
    details,
  });
}
