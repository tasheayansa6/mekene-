import { db } from '@/lib/db';
import { success } from '@/lib/api/response';

export async function GET() {
  const rows = await db.contentTag.findMany({
    orderBy: { name: 'asc' },
    select: { name: true, slug: true },
  });
  return success(rows);
}
