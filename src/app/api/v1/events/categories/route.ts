import { db } from '@/lib/db';
import { success } from '@/lib/api/response';

export async function GET() {
  const rows = await db.eventCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { name: true, slug: true, description: true },
  });
  return success(rows);
}
