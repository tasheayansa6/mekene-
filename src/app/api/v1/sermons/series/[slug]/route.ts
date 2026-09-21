import { notFound, success } from '@/lib/api/response';
import { getPublicSeriesBySlug } from '@/lib/sermons/public';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const result = await getPublicSeriesBySlug(slug);
  if (!result) return notFound('Series');
  return success(result);
}
