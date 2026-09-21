import { error, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { enforceAdminRateLimit } from '@/lib/admin/guard';
import { guardLiveAdminWrite } from '@/lib/live/guard';
import { getLiveSessionById, setProgramCursor } from '@/lib/live/sessions';
import { serializeAdminLiveSession } from '@/lib/live/serialize';
import { liveProgramActiveSchema, formatZodErrors } from '@/lib/live/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardLiveAdminWrite(request, 'manage');
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-program');
  if (limited) return limited;

  const { id } = await context.params;
  const existing = await getLiveSessionById(id);
  if (!existing) return notFound('Live session');

  const parsed = liveProgramActiveSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await setProgramCursor({
    sessionId: id,
    programItemId: parsed.data.programItemId,
    label: parsed.data.label,
    userId: auth.user.id,
    request,
  });
  if (!result.ok) return error(result.error, 400);
  return success({
    session: serializeAdminLiveSession(result.session),
    cursor: result.cursor,
  });
}
