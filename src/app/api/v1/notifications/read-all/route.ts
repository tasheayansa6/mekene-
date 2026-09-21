import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const result = await db.appNotification.updateMany({
    where: { userId: auth.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return success({ updated: result.count }, 'All notifications marked as read.');
}
