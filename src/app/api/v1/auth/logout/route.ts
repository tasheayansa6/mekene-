import { success } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { clearSessionCookie } from '@/lib/auth/cookies';
import { getSessionTokenFromRequest } from '@/lib/auth/cookies';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';
import { getUserBySessionToken, revokeSessionToken } from '@/lib/auth/session';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const token = getSessionTokenFromRequest(request);
  if (!token) {
    const response = success({ signedOut: true }, 'Signed out');
    clearSessionCookie(response);
    return response;
  }

  const user = await getUserBySessionToken(token);
  await revokeSessionToken(token);

  await logSecurityEvent({
    action: 'logout',
    entity: 'auth',
    userId: user?.id ?? null,
    entityId: user?.id ?? null,
    ipAddress: getClientIp(request),
  });

  const response = success({ signedOut: true }, 'Signed out');
  clearSessionCookie(response);
  return response;
}
