import { error, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { enforceAdminRateLimit } from '@/lib/admin/guard';
import { guardLiveAdminWrite } from '@/lib/live/guard';
import { associateRecording, getLiveSessionById } from '@/lib/live/sessions';
import { serializeAdminLiveSession } from '@/lib/live/serialize';
import { liveRecordingSchema, formatZodErrors } from '@/lib/live/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardLiveAdminWrite(request, 'manage');
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-recording');
  if (limited) return limited;

  const { id } = await context.params;
  const existing = await getLiveSessionById(id);
  if (!existing) return notFound('Live session');

  const parsed = liveRecordingSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await associateRecording({
    id,
    sermonId: parsed.data.sermonId,
    userId: auth.user.id,
    request,
  });
  if (!result.ok) return error(result.error, 400);
  return success(serializeAdminLiveSession(result.session), 'Recording sermon associated.');
}
