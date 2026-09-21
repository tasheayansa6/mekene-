import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { serializeAssignment } from '@/lib/volunteers/serialize';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) return success({ items: [] });

  const from = new Date();
  from.setDate(from.getDate() - 7);
  const to = new Date();
  to.setDate(to.getDate() + 60);

  const [assignments, enrollments] = await Promise.all([
    db.serviceAssignment.findMany({
      where: {
        memberId: member.id,
        scheduledAt: { gte: from, lte: to },
        status: { notIn: ['cancelled'] },
      },
      include: {
        event: { select: { id: true, title: true, slug: true, startAt: true, endAt: true } },
        ministry: { select: { id: true, name: true, slug: true } },
        team: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 80,
    }),
    db.trainingEnrollment.findMany({
      where: {
        memberId: member.id,
        status: { in: ['enrolled', 'attended'] },
        session: { startsAt: { gte: from, lte: to } },
      },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            program: { select: { name: true } },
          },
        },
      },
      take: 40,
    }),
  ]);

  return success({
    items: [
      ...assignments.map((row) => ({
        kind: 'assignment' as const,
        startAt: row.scheduledAt.toISOString(),
        endAt: row.endsAt?.toISOString() ?? null,
        title: row.roleName,
        assignment: serializeAssignment(row),
      })),
      ...enrollments.map((row) => ({
        kind: 'training' as const,
        startAt: row.session.startsAt.toISOString(),
        endAt: row.session.endsAt?.toISOString() ?? null,
        title: row.session.program.name,
        session: row.session.title,
      })),
    ].sort((a, b) => a.startAt.localeCompare(b.startAt)),
  });
}
