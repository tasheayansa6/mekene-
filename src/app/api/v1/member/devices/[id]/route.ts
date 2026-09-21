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
  const row = await db.memberDevice.findFirst({
    where: { id, userId: auth.user.id, revokedAt: null },
  });
  if (!row) return notFound('Device');

  await db.memberDevice.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });
  return success({ revoked: true });
}
