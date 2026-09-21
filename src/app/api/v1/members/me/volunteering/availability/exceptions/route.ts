import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { exceptionCreateSchema, formatZodErrors } from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;
  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) return success({ exceptions: [] });
  const rows = await db.availabilityException.findMany({
    where: { memberId: member.id },
    orderBy: { startAt: 'desc' },
    take: 50,
  });
  return success({
    exceptions: rows.map((row) => ({
      id: row.id,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      reason: row.reason,
      isAvailable: row.isAvailable,
    })),
  });
}

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;
  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) return error('You do not have a church membership record yet.', 404);

  const parsed = exceptionCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const startAt = new Date(parsed.data.startAt);
  const endAt = new Date(parsed.data.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    return validationError({ endAt: ['End must be after start'] });
  }

  const row = await db.availabilityException.create({
    data: {
      memberId: member.id,
      startAt,
      endAt,
      reason: parsed.data.reason ? sanitizePlainText(parsed.data.reason, 80) : 'Unavailable',
      isAvailable: parsed.data.isAvailable ?? false,
    },
  });

  return success(
    {
      exception: {
        id: row.id,
        startAt: row.startAt.toISOString(),
        endAt: row.endAt.toISOString(),
        reason: row.reason,
        isAvailable: row.isAvailable,
      },
    },
    'Unavailability saved.',
    201
  );
}
