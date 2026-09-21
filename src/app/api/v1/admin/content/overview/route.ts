import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { promoteScheduledContent } from '@/lib/content/query';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;
  await promoteScheduledContent();

  const [pages, news, announcements, resources, categories, tags] = await Promise.all([
    db.cmsPage.groupBy({ by: ['status'], _count: { _all: true } }),
    db.newsArticle.groupBy({ by: ['status'], _count: { _all: true } }),
    db.announcement.groupBy({ by: ['status'], _count: { _all: true } }),
    db.resource.groupBy({ by: ['status'], _count: { _all: true } }),
    db.contentCategory.count(),
    db.contentTag.count(),
  ]);

  function totals(groups: Array<{ status: string; _count: { _all: number } }>) {
    const byStatus = Object.fromEntries(groups.map((row) => [row.status, row._count._all]));
    return {
      total: groups.reduce((sum, row) => sum + row._count._all, 0),
      draft: byStatus.draft || 0,
      review: byStatus.review || 0,
      scheduled: byStatus.scheduled || 0,
      published: byStatus.published || 0,
      archived: byStatus.archived || 0,
    };
  }

  return success({
    pages: totals(pages),
    news: totals(news),
    announcements: totals(announcements),
    resources: totals(resources),
    categories,
    tags,
  });
}
