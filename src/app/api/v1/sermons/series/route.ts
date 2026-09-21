import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { promoteScheduledContent } from '@/lib/content/query';
import { publicStatusWhere } from '@/lib/content/status';

export async function GET() {
  await promoteScheduledContent();
  const rows = await db.sermonSeries.findMany({
    where: publicStatusWhere(),
    orderBy: { name: 'asc' },
    select: {
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      _count: { select: { sermons: { where: publicStatusWhere() } } },
    },
  });
  return success(
    rows.map((row) => ({
      name: row.name,
      slug: row.slug,
      description: row.description,
      imageUrl: row.imageUrl,
      sermonCount: row._count.sermons,
    }))
  );
}
