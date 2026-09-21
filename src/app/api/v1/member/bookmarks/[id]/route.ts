import { db } from '@/lib/db';
import { forbidden, notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const existing = await db.sermonBookmark.findUnique({ where: { id } });
  if (!existing) return notFound('Bookmark');
  if (existing.userId !== auth.user.id) return forbidden();

  await db.sermonBookmark.delete({ where: { id } });
  return success({ id }, 'Bookmark removed.');
}
