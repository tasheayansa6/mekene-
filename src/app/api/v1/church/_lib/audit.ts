import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';

export async function auditChurchChange(
  request: Request,
  userId: string,
  action: string,
  entity: string,
  entityId?: string | null,
  details?: Record<string, unknown>
) {
  await logSecurityEvent({
    action,
    entity,
    entityId: entityId ?? null,
    userId,
    ipAddress: getClientIp(request),
    details: details ?? null,
  });
}
