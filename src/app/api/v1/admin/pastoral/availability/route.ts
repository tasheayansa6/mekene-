import { badRequest, forbidden, success } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { hasPermission } from '@/lib/auth/permissions';
import {
  listCareAvailability,
  upsertCareAvailability,
} from '@/lib/pastoral/appointments';

function canManageCareAvailability(user: Parameters<typeof hasPermission>[0]) {
  return (
    hasPermission(user, 'pastoral', 'view') ||
    hasPermission(user, 'pastoral', 'manage') ||
    hasPermission(user, 'pastoral', 'assign')
  );
}

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'pastoral', 'view');
  if (!auth.ok) return auth.error;
  if (!canManageCareAvailability(auth.user)) return forbidden();

  const url = new URL(request.url);
  const mine = url.searchParams.get('mine') === '1';
  const rows = await listCareAvailability({
    userId: mine ? auth.user.id : undefined,
    activeOnly: url.searchParams.get('all') !== '1',
  });
  return success(rows);
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'pastoral', 'update');
  if (!auth.ok) return auth.error;
  if (!canManageCareAvailability(auth.user)) return forbidden();

  const body = (await readJson(request)) as { slots?: unknown } | null;
  if (!body || !Array.isArray(body.slots) || body.slots.length === 0) {
    return badRequest('slots array is required');
  }

  try {
    const rows = await upsertCareAvailability({
      userId: auth.user.id,
      slots: body.slots as Array<{
        id?: string;
        weekday: number;
        startTime: string;
        endTime: string;
        durationMin?: number;
        locationType?: string;
        isActive?: boolean;
      }>,
    });
    return success(rows, 'Availability saved.');
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Unable to save availability');
  }
}
