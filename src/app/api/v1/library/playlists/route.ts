import { paginated } from '@/lib/api/response';
import { listPublicPlaylists } from '@/lib/library/playlists';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(24, Math.max(1, Number(url.searchParams.get('pageSize') || 12)));
  const featured = url.searchParams.get('featured') === 'true';

  const result = await listPublicPlaylists({ page, pageSize, featured });
  return paginated(result.playlists, {
    page: result.page,
    pageSize: result.pageSize,
    totalItems: result.totalItems,
  });
}
