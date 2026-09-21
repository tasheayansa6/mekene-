import { error, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';
import { serializeGivingSchedule } from '@/lib/finance/serialize';
import { cancelGivingSchedule } from '@/lib/finance/write';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await params;
  const result = await cancelGivingSchedule({
    scheduleId: id,
    userId: auth.user.id,
    request,
  });
  if (!result.ok) return error(result.error, (result.status as 403 | 404) || 400);

  return success(
    { schedule: serializeGivingSchedule(result.schedule) },
    'Giving schedule cancelled.'
  );
}
