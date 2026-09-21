import { db } from '@/lib/db';
import { notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { requireActiveMemberForUser } from '@/lib/attendance/write';
import { serializeRecordSelf } from '@/lib/attendance/serialize';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await requireActiveMemberForUser(auth.user.id);
  if (!member) return notFound('Attendance record');

  const { id } = await context.params;
  const row = await db.attendanceRecord.findFirst({
    where: { id, memberId: member.id },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          sessionType: true,
          startsAt: true,
          timezone: true,
        },
      },
    },
  });
  if (!row) return notFound('Attendance record');

  return success({ record: serializeRecordSelf(row) });
}
