import { db } from '@/lib/db';
import { notFound } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { success } from '@/lib/api/response';
import { serializeMemberPrayer } from '@/lib/prayer/serialize';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const row = await db.prayerRequest.findFirst({
    where: { id, userId: auth.user.id },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
  if (!row) return notFound('Prayer request');
  return success(serializeMemberPrayer(row));
}
