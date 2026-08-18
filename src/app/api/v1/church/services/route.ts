import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { DAY_ORDER } from '../_lib/validation';

export async function GET() {
  const profile = await db.churchProfile.findFirst({
    where: { isActive: true, status: 'published' },
    select: { id: true },
  });

  if (!profile) {
    return success([]);
  }

  const schedules = await db.serviceSchedule.findMany({
    where: {
      churchProfileId: profile.id,
      isActive: true,
    },
    orderBy: [{ sortOrder: 'asc' }],
  });

  // Sort by day-of-week order as secondary sort
  const sorted = [...schedules].sort(
    (a, b) =>
      (DAY_ORDER[a.dayOfWeek] ?? 99) - (DAY_ORDER[b.dayOfWeek] ?? 99)
  );

  return success(sorted);
}
