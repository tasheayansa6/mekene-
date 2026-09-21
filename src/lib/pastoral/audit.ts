import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { db } from '@/lib/db';

/**
 * Access logging for confidential pastoral resources.
 * NEVER store note content, case summaries, or private details.
 */
export async function logPastoralAccess(options: {
  actorId?: string | null;
  resource: string;
  resourceId?: string | null;
  action: string;
  request?: Request;
}) {
  await db.pastoralAccessLog.create({
    data: {
      actorId: options.actorId ?? null,
      resource: options.resource,
      resourceId: options.resourceId ?? null,
      action: options.action,
    },
  });

  await logSecurityEvent({
    action: options.action,
    entity: options.resource,
    entityId: options.resourceId ?? null,
    userId: options.actorId ?? null,
    ipAddress: options.request ? getClientIp(options.request) : null,
    details: null,
  });
}
