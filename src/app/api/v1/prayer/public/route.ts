import { paginated, validationError } from '@/lib/api/response';
import { formatZodErrors, publicPrayerListSchema } from '@/lib/prayer/validation';
import { getPublicPrayerList } from '@/lib/prayer/public';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = publicPrayerListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 12,
    category: url.searchParams.get('category') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const result = await getPublicPrayerList({
    q: parsed.data.q,
    category: parsed.data.category,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  });
  return paginated(result.items, {
    page: result.page,
    pageSize: result.pageSize,
    totalItems: result.totalItems,
  });
}
