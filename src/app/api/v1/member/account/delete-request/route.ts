import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';

export async function POST(request: Request) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  await logSecurityEvent({
    action: 'member.account_deletion_requested',
    entity: 'user',
    entityId: auth.user.id,
    userId: auth.user.id,
    ipAddress: getClientIp(request),
  });

  return success(
    { requested: true },
    'Your account deletion request was recorded. The church office will follow up. This does not immediately delete your account.'
  );
}
