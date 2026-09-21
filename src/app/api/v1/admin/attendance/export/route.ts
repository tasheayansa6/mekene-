import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forbidden } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canExportAttendance, sessionListWhere } from '@/lib/attendance/access';
import { emitAttendanceEvent } from '@/lib/attendance/events';
import { methodLabel, recordStatusLabel, sessionTypeLabel } from '@/lib/attendance/status';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'attendance', 'manage');
  if (!auth.ok) return auth.error;
  if (!canExportAttendance(auth.user)) return forbidden();

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId') || undefined;

  const rows = await db.attendanceRecord.findMany({
    where: {
      session: sessionListWhere(auth.user),
      ...(sessionId ? { sessionId } : {}),
    },
    include: {
      session: { select: { title: true, sessionType: true, startsAt: true } },
      member: {
        select: {
          membershipNumber: true,
          displayName: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { checkInAt: 'desc' },
    take: 2000,
  });

  const header = [
    'session_title',
    'session_type',
    'session_starts_at',
    'member_name',
    'membership_number',
    'status',
    'method',
    'check_in_at',
  ];
  const lines = [header.join(',')];
  for (const row of rows) {
    const name =
      row.member.displayName ||
      `${row.member.user.firstName} ${row.member.user.lastName}`.trim();
    lines.push(
      [
        csv(row.session.title),
        csv(sessionTypeLabel(row.session.sessionType)),
        csv(row.session.startsAt.toISOString()),
        csv(name),
        csv(row.member.membershipNumber || ''),
        csv(recordStatusLabel(row.status)),
        csv(methodLabel(row.method)),
        csv(row.checkInAt?.toISOString() || ''),
      ].join(',')
    );
  }

  await emitAttendanceEvent({
    type: 'attendance.exported',
    userId: auth.user.id,
    request,
    details: { count: rows.length, sessionId: sessionId || null },
  });

  return new NextResponse(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="attendance-export.csv"',
    },
  });
}

function csv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
