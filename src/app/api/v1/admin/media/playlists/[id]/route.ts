import { notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import {
  getAdminPlaylistById,
  publishPlaylist,
  updatePlaylist,
} from '@/lib/library/playlists';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(120).optional(),
  description: z.string().max(5000).nullable().optional(),
  coverImageUrl: z.string().max(500).nullable().optional(),
  isPublic: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  status: z.enum(['draft', 'review', 'scheduled', 'published', 'archived']).optional(),
  publish: z.boolean().optional(),
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

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardMediaRead(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const playlist = await getAdminPlaylistById(id);
  if (!playlist) return notFound('Playlist');
  return success({ playlist });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardMediaWrite(request, 'update');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const existing = await getAdminPlaylistById(id);
  if (!existing) return notFound('Playlist');

  if (parsed.data.publish) {
    await publishPlaylist(id);
  } else {
    await updatePlaylist(id, parsed.data);
  }

  const playlist = await getAdminPlaylistById(id);
  return success({ playlist }, 'Playlist updated.');
}
