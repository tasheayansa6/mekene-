import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { getPaymentProvider } from '@/lib/giving/providers';
import { serializeGivingSchedule } from '@/lib/finance/serialize';
import { givingScheduleCreateSchema } from '@/lib/finance/validation';
import { createGivingSchedule } from '@/lib/finance/write';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const rows = await db.givingSchedule.findMany({
    where: { userId: auth.user.id },
    include: {
      fund: { select: { id: true, slug: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const recurringSupported = getPaymentProvider().supportsRecurring;

  return success({
    schedules: rows.map((row) =>
      serializeGivingSchedule({
        ...row,
        notes: recurringSupported || row.status === 'cancelled' ? null : 'pending provider',
      })
    ),
    recurringSupported,
  });
}

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = givingScheduleCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await createGivingSchedule({
    ...parsed.data,
    userId: auth.user.id,
    request,
  });
  if (!result.ok) return error(result.error, 400);

  return success(
    {
      schedule: serializeGivingSchedule({
        ...result.schedule,
        notes: result.notes,
      }),
      message: result.message,
      recurringSupported: getPaymentProvider().supportsRecurring,
    },
    result.message,
    201
  );
}
