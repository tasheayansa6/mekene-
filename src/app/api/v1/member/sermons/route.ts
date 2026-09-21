import { paginated, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { formatZodErrors, publicSermonListSchema } from '@/lib/sermons/validation';
import { getPublicSermonList } from '@/lib/sermons/public';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const parsed = publicSermonListSchema.safeParse({
    q: url.searchParams.get('q') || url.searchParams.get('search') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 12,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const [result, bookmarks] = await Promise.all([
    getPublicSermonList({
      q: parsed.data.q,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      includeMembersContent: true,
    }),
    db.sermonBookmark.findMany({
      where: { userId: auth.user.id },
      select: { sermonId: true },
    }),
  ]);

  const saved = new Set(bookmarks.map((row) => row.sermonId));
  return paginated(
    result.sermons.map((sermon) => ({
      ...sermon,
      saved: saved.has(sermon.id),
    })),
    {
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
    }
  );
}
