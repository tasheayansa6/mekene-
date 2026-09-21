import { db } from '@/lib/db';
import { notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const existing = await db.appNotification.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) return notFound('Notification');

  if (!existing.readAt) {
    await db.appNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  return success({ id, read: true }, 'Notification marked as read.');
}
