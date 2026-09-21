import { db } from '@/lib/db';
import { notFound, success } from '@/lib/api/response';
import { promoteScheduledContent, serializeAuthor, authorSelect } from '@/lib/content/query';
import { isPubliclyVisible } from '@/lib/content/status';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  await promoteScheduledContent();
  const { slug } = await context.params;
  const row = await db.announcement.findUnique({
    where: { slug },
    include: { author: { select: authorSelect } },
  });

  if (!row || !isPubliclyVisible(row) || row.audience !== 'everyone') {
    return notFound('Announcement');
  }

  const now = new Date();
  if (row.startAt > now || (row.endAt && row.endAt <= now)) {
    return notFound('Announcement');
  }

  return success({
    announcement: {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      content: row.content,
      category: row.category,
      priority: row.priority,
      isFeatured: row.isFeatured,
      featuredImageUrl: row.featuredImageUrl,
      featuredImageAlt: row.featuredImageAlt,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      publishedAt: (row.publishedAt || row.startAt).toISOString(),
      startAt: row.startAt.toISOString(),
      endAt: row.endAt?.toISOString() ?? null,
      author: serializeAuthor(row.author),
    },
  });
}
