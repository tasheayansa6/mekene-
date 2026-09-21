import { paginated, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import {
  createPlaylist,
  getAdminPlaylistById,
  listAdminPlaylists,
} from '@/lib/library/playlists';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(120).optional(),
  description: z.string().max(5000).optional(),
  coverImageUrl: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

async function guardMediaRead(request: Request) {
  let auth = await guardAdminRead(request, 'media', 'view');
  if (!auth.ok) auth = await guardAdminRead(request, 'sermons', 'view');
  return auth;
}

async function guardMediaWrite(request: Request, action: 'create' | 'update' | 'delete') {
  let auth = await guardAdminWrite(request, 'media', action);
  if (!auth.ok) auth = await guardAdminWrite(request, 'sermons', action);
  return auth;
}

export async function GET(request: Request) {
  const auth = await guardMediaRead(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const status = url.searchParams.get('status') || undefined;
  const q = url.searchParams.get('q') || undefined;

  const result = await listAdminPlaylists({ page, pageSize, status, q });
  return paginated(result.playlists, {
    page: result.page,
    pageSize: result.pageSize,
    totalItems: result.totalItems,
  });
}

export async function POST(request: Request) {
  const auth = await guardMediaWrite(request, 'create');
  if (!auth.ok) return auth.error;

  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const row = await createPlaylist({
    ...parsed.data,
    ownerId: auth.user.id,
  });
  const playlist = await getAdminPlaylistById(row.id);
  return success({ playlist }, 'Playlist created.', 201);
}
