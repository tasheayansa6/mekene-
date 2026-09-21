import { error, success } from '@/lib/api/response';
import { getPublicAlbumBySlug } from '@/lib/gallery/public';
import { RESERVED_ALBUM_SLUGS } from '@/lib/gallery/access';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED_ALBUM_SLUGS.has(slug)) return error('Album not found.', 404);
  const album = await getPublicAlbumBySlug(slug);
  if (!album) return error('Album not found.', 404);
  return success(album);
}
