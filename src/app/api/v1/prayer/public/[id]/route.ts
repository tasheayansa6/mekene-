import { notFound } from '@/lib/api/response';
import { getPublicPrayerById } from '@/lib/prayer/public';
import { success } from '@/lib/api/response';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const row = await getPublicPrayerById(id);
  if (!row) return notFound('Prayer request');
  return success(row);
}
