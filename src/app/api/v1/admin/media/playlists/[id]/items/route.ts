import { notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { getAdminPlaylistById, setPlaylistItems } from '@/lib/library/playlists';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

type RouteContext = { params: Promise<{ id: string }> };

const itemsSchema = z.object({
  items: z.array(
    z.object({
      sermonId: z.string().optional().nullable(),
      seriesId: z.string().optional().nullable(),
      sortOrder: z.number().int().min(0),
    })
  ),
});

async function guardMediaWrite(request: Request) {
  let auth = await guardAdminWrite(request, 'media', 'update');
  if (!auth.ok) auth = await guardAdminWrite(request, 'sermons', 'update');
  return auth;
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await guardMediaWrite(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const existing = await getAdminPlaylistById(id);
  if (!existing) return notFound('Playlist');

  const parsed = itemsSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const playlist = await setPlaylistItems(id, parsed.data.items);
  return success({ playlist }, 'Playlist items updated.');
}
