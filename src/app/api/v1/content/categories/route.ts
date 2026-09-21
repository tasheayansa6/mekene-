import { db } from '@/lib/db';
import { success } from '@/lib/api/response';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope');
  const rows = await db.contentCategory.findMany({
    where: scope === 'news' || scope === 'resource' ? { scope } : undefined,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { name: true, slug: true, scope: true, description: true },
  });
  return success(rows);
}
