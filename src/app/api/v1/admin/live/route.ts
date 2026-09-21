import { error, paginated, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { enforceAdminRateLimit } from '@/lib/admin/guard';
import { guardLiveAdminRead, guardLiveAdminWrite } from '@/lib/live/guard';
import { createLiveSession, listAdminLiveSessions } from '@/lib/live/sessions';
import { serializeAdminLiveSession } from '@/lib/live/serialize';
import {
  adminLiveListSchema,
  liveSessionWriteSchema,
  formatZodErrors,
} from '@/lib/live/validation';
import { parseEventDateTime } from '@/lib/events/timezone';

export async function GET(request: Request) {
  const auth = await guardLiveAdminRead(request);
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-list');
  if (limited) return limited;

  const url = new URL(request.url);
  const parsed = adminLiveListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await listAdminLiveSessions(parsed.data);
  return paginated(
    result.rows.map((row) => serializeAdminLiveSession(row)),
    { page: result.page, pageSize: result.pageSize, totalItems: result.totalItems }
  );
}

export async function POST(request: Request) {
  const auth = await guardLiveAdminWrite(request, 'create');
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-create');
  if (limited) return limited;

  const parsed = liveSessionWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const timezone = parsed.data.timezone || 'Africa/Addis_Ababa';
  const result = await createLiveSession({
    data: {
      ...parsed.data,
      scheduledStartAt: parsed.data.scheduledStartAt
        ? parseEventDateTime(parsed.data.scheduledStartAt, timezone) || undefined
        : undefined,
      scheduledEndAt:
        parsed.data.scheduledEndAt === undefined
          ? undefined
          : parsed.data.scheduledEndAt
            ? parseEventDateTime(parsed.data.scheduledEndAt, timezone)
            : null,
    },
    createdById: auth.user.id,
    request,
  });

  if (!result.ok) return error(result.error, 400);

  return success(serializeAdminLiveSession(result.session), 'Live session created.', 201);
}
