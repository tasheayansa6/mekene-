import { db } from '@/lib/db';
import { error, forbidden, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { canManageTeam, canViewAvailability } from '@/lib/volunteers/access';
import { serializeAvailability } from '@/lib/volunteers/serialize';
import { volunteerLeaderScope } from '@/lib/volunteers/scope';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const memberId = new URL(request.url).searchParams.get('memberId') || '';
  if (!memberId) return validationError({ memberId: ['Required'] });

  const member = await db.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      userId: true,
      ministries: { select: { ministry: { select: { id: true, leaderUserId: true } } } },
      teamMemberships: {
        where: { status: 'active' },
        include: {
          team: {
            include: { ministry: { select: { id: true, leaderUserId: true } } },
          },
        },
      },
    },
  });
  if (!member) return error('Member not found.', 404);

  const scope = await volunteerLeaderScope(auth.user);
  const team = member.teamMemberships.find((row) => canManageTeam(auth.user, row.team))?.team;
  const ministry = team?.ministry || member.ministries[0]?.ministry || null;
  if (!canViewAvailability(auth.user, member.userId, ministry, team || null) && !scope.isGlobal) {
    return forbidden();
  }

  const [slots, exceptions] = await Promise.all([
    db.volunteerAvailability.findMany({
      where: { memberId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    }),
    db.availabilityException.findMany({
      where: { memberId, endAt: { gte: new Date() } },
      orderBy: { startAt: 'asc' },
      take: 20,
    }),
  ]);

  return success({
    slots: slots.map(serializeAvailability),
    exceptions: exceptions.map((row) => ({
      id: row.id,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      reason: row.reason,
      isAvailable: row.isAvailable,
    })),
  });
}
