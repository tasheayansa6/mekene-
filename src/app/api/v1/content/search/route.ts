import { success, validationError } from '@/lib/api/response';
import { searchPublicContent } from '@/lib/cms/search';
import { formatZodErrors, searchSchema } from '@/lib/content/validation';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = searchSchema.safeParse({
    q: url.searchParams.get('q') || '',
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 12,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, page, pageSize } = parsed.data;
  const data = await searchPublicContent(q, { page, pageSize });
  return success(data);
}
