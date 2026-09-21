import { success, validationError } from '@/lib/api/response';
import { searchLibrary } from '@/lib/library/search';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || url.searchParams.get('search') || '';
  if (!q.trim()) {
    return validationError({ q: ['Search query is required.'] });
  }

  const kind = url.searchParams.get('kind') as 'sermon' | 'resource' | 'playlist' | 'all' | null;
  const contentType = url.searchParams.get('contentType') || undefined;
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(24, Math.max(1, Number(url.searchParams.get('pageSize') || 12)));

  const data = await searchLibrary(q, {
    kind: kind || 'all',
    contentType,
    page,
    pageSize,
  });

  return success(data);
}
