import { db } from '@/lib/db';
import { promoteScheduledContent } from '@/lib/content/query';
import { isPubliclyVisible, publicStatusWhere } from '@/lib/content/status';
import { relatedSermonScore } from '@/lib/sermons/player';
import { sermonInclude, serializeSermon, speakerLabel } from '@/lib/sermons/serialize';

export { relatedSermonScore };

export async function relatedSermons(sermon: {
  id: string;
  seriesId: string | null;
  speakerId: string | null;
  categoryId: string | null;
}) {
  await promoteScheduledContent();

  const relatedWhere = {
    AND: [
      publicStatusWhere(),
      { id: { not: sermon.id } },
      { accessLevel: 'public' as const },
      {
        OR: [
          sermon.seriesId ? { seriesId: sermon.seriesId } : null,
          sermon.speakerId ? { speakerId: sermon.speakerId } : null,
          sermon.categoryId ? { categoryId: sermon.categoryId } : null,
        ].filter(Boolean) as object[],
      },
    ],
  };

  if ((relatedWhere.AND[2] as { OR: object[] }).OR.length === 0) {
    return [];
  }

  const rows = await db.sermon.findMany({
    where: relatedWhere,
    take: 12,
    orderBy: { sermonDate: 'desc' },
    include: sermonInclude,
  });

  return rows
    .filter((row) => isPubliclyVisible(row))
    .sort((left, right) => relatedSermonScore(sermon, left) - relatedSermonScore(sermon, right))
    .slice(0, 6)
    .map((item) => ({
      title: item.title,
      slug: item.slug,
      description: item.description,
      sermonDate: item.sermonDate.toISOString(),
      thumbnailUrl: item.thumbnailUrl,
      speakerName: speakerLabel(item),
      series: item.series,
      href: `/sermons/${item.slug}`,
      serialized: serializeSermon(item, { forPublic: true }),
    }));
}
