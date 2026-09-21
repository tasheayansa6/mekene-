import { notFound, success } from '@/lib/api/response';
import { getPublicPlaylistBySlug } from '@/lib/library/playlists';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const result = await getPublicPlaylistBySlug(slug);
  if (!result) return notFound('Playlist');
  return success(result);
}
