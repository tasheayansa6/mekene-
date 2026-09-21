import { forbidden, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { rejectIfCsrfInvalid, readJson } from '@/lib/auth/http';
import {
  clearHistory,
  getProgress,
  listContinueWatching,
  upsertProgress,
} from '@/lib/library/progress';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

const progressSchema = z.object({
  sermonId: z.string().min(1),
  positionSeconds: z.number().min(0),
  durationSeconds: z.number().min(0).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const sermonId = url.searchParams.get('sermonId');
  if (sermonId) {
    const progress = await getProgress(auth.user.id, sermonId);
    return success({ progress });
  }

  const items = await listContinueWatching(auth.user.id);
  return success({ items });
}

export async function POST(request: Request) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = progressSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await upsertProgress({
    userId: auth.user.id,
    sermonId: parsed.data.sermonId,
    positionSeconds: parsed.data.positionSeconds,
    durationSeconds: parsed.data.durationSeconds,
  });
  if (!result) return forbidden('Unable to save progress for this sermon.');

  return success(result);
}

export async function DELETE(request: Request) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const result = await clearHistory(auth.user.id);
  return success(result, 'Playback history cleared.');
}
