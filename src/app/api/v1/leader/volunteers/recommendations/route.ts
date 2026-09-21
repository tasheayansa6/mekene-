import { db } from '@/lib/db';
import { forbidden, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { evaluateEligibility, gatherEligibilityFacts } from '@/lib/volunteers/eligibility';
import { recommendationExplanation, recommendationScore } from '@/lib/volunteers/recommendations';
import { formatZodErrors, recommendQuerySchema } from '@/lib/volunteers/validation';
import { volunteerLeaderScope } from '@/lib/volunteers/scope';
import { canManageAssignments, canViewVolunteers } from '@/lib/volunteers/access';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const scope = await volunteerLeaderScope(auth.user);
  if (!scope.isGlobal && scope.teamIds.length === 0 && !canViewVolunteers(auth.user) && !canManageAssignments(auth.user)) {
    return forbidden();
  }

  const url = new URL(request.url);
  const parsed = recommendQuerySchema.safeParse({
    eventId: url.searchParams.get('eventId') || undefined,
    roleId: url.searchParams.get('roleId') || undefined,
    roleName: url.searchParams.get('roleName') || undefined,
    ministryId: url.searchParams.get('ministryId') || undefined,
    teamId: url.searchParams.get('teamId') || undefined,
    scheduledAt: url.searchParams.get('scheduledAt') || undefined,
    endsAt: url.searchParams.get('endsAt') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const event = await db.event.findUnique({
    where: { id: parsed.data.eventId },
    select: { id: true, startAt: true, endAt: true },
  });
  if (!event) return validationError({ eventId: ['Event not found'] });

  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : event.startAt;
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : event.endAt;
  const roleName = parsed.data.roleName || 'Volunteer';

  const profiles = await db.volunteerProfile.findMany({
    where: { status: { in: ['approved', 'active'] } },
    select: {
      memberId: true,
      member: {
        select: {
          id: true,
          displayName: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    take: 40,
  });

  const recommendations = [];
  for (const profile of profiles) {
    const facts = await gatherEligibilityFacts({
      memberId: profile.memberId,
      ministryId: parsed.data.ministryId,
      teamId: parsed.data.teamId,
      roleId: parsed.data.roleId,
      eventId: parsed.data.eventId,
      roleName,
      scheduledAt,
      endsAt,
    });
    const result = evaluateEligibility(facts);
    if (!result.ok) continue;
    recommendations.push({
      memberId: profile.memberId,
      name:
        profile.member.displayName ||
        `${profile.member.user?.firstName || ''} ${profile.member.user?.lastName || ''}`.trim() ||
        'Member',
      score: recommendationScore(result),
      why: recommendationExplanation(result),
    });
  }

  recommendations.sort((a, b) => b.score - a.score);
  return success({
    recommendations: recommendations.slice(0, 8),
    note: 'Recommendations only. Assignment requires authorized human action.',
  });
}
