import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forbidden } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canExportMembers, memberListWhere } from '@/lib/members/access';
import { emitMembershipEvent } from '@/lib/members/events';

function csvEscape(value: string | null | undefined) {
  const raw = value ?? '';
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'members', 'export');
  if (!auth.ok) return auth.error;
  if (!canExportMembers(auth.user)) return forbidden();

  const scoped = memberListWhere(auth.user);
  const rows = await db.member.findMany({
    where: { ...scoped, status: { notIn: ['archived', 'deceased'] } },
    include: {
      user: { select: { email: true, firstName: true, lastName: true, phone: true } },
      membershipType: { select: { name: true } },
      household: { select: { familyReference: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const header = [
    'membershipNumber',
    'firstName',
    'lastName',
    'email',
    'status',
    'membershipType',
    'familyReference',
    'dateJoined',
  ];
  const lines = [
    header.join(','),
    ...rows.map((row) =>
      [
        csvEscape(row.membershipNumber),
        csvEscape(row.user.firstName),
        csvEscape(row.user.lastName),
        csvEscape(row.user.email),
        csvEscape(row.status),
        csvEscape(row.membershipType?.name),
        csvEscape(row.household?.familyReference),
        csvEscape(row.dateJoined?.toISOString().slice(0, 10)),
      ].join(',')
    ),
  ];

  await emitMembershipEvent({
    type: 'membership.export',
    userId: auth.user.id,
    request,
    details: { rowCount: rows.length },
  });

  return new NextResponse(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="members-export.csv"',
    },
  });
}
