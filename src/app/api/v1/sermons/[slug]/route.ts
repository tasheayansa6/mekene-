import { notFound, success } from '@/lib/api/response';
import { getPublicSermonBySlug } from '@/lib/sermons/public';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  if (slug === 'series' || slug === 'categories') return notFound('Sermon');
  const result = await getPublicSermonBySlug(slug);
  if (!result) return notFound('Sermon');
  return success(result);
}
