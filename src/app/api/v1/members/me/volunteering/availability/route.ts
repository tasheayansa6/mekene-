import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { serializeAvailability } from '@/lib/volunteers/serialize';
import { availabilityPutSchema, formatZodErrors } from '@/lib/volunteers/validation';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) {
    return success({ slots: [] });
  }

  const rows = await db.volunteerAvailability.findMany({
    where: { memberId: member.id },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  return success({ slots: rows.map(serializeAvailability) });
}

export async function PUT(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) {
    return error('You do not have a church membership record yet.', 404);
  }

  const parsed = availabilityPutSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  for (const slot of parsed.data.slots) {
    if (slot.endTime <= slot.startTime) {
      return validationError({
        slots: ['Each slot endTime must be after startTime'],
      });
    }
  }

  const rows = await db.$transaction(async (tx) => {
    await tx.volunteerAvailability.deleteMany({ where: { memberId: member.id } });
    if (parsed.data.slots.length === 0) return [];

    await tx.volunteerAvailability.createMany({
      data: parsed.data.slots.map((slot) => ({
        memberId: member.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable ?? true,
      })),
    });

    return tx.volunteerAvailability.findMany({
      where: { memberId: member.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  });

  return success(
    { slots: rows.map(serializeAvailability) },
    'Availability updated.'
  );
}
