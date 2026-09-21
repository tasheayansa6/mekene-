import { db } from '@/lib/db';
import { success } from '@/lib/api/response';

export async function GET() {
  const rows = await db.eventLocation.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { name: true, slug: true, address: true, mapUrl: true },
  });
  return success(rows);
}
