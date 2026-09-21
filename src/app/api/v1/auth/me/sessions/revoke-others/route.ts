import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';
import { getSessionTokenFromRequest } from '@/lib/auth/cookies';
import { revokeOtherUserSessions } from '@/lib/auth/session';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { error } from '@/lib/api/response';

export async function POST(request: Request) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const token = getSessionTokenFromRequest(request);
  if (!token) return error('No active session.', 401);

  const count = await revokeOtherUserSessions(auth.user.id, token);
  await logSecurityEvent({
    action: 'sessions_revoked_others',
    entity: 'auth',
    userId: auth.user.id,
    entityId: auth.user.id,
    details: { count },
    ipAddress: getClientIp(request),
  });

  return success({ revoked: count }, 'Other sessions were signed out.');
}
