import { db } from '@/lib/db';
import { notFound, success } from '@/lib/api/response';
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
  const row = await db.savedItem.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!row) return notFound('Saved item');

  await db.savedItem.delete({ where: { id: row.id } });
  if (row.kind === 'sermon') {
    await db.sermonBookmark.deleteMany({
      where: { userId: auth.user.id, sermonId: row.entityId },
    });
  }
  return success({ deleted: true });
}
