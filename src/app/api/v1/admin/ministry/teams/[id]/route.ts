import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { sanitizePlainText } from '@/lib/content/sanitize';
import {
  canAccessTeam,
  canManageAssignments,
  canViewVolunteers,
} from '@/lib/volunteers/access';
import { serializeTeam, teamInclude } from '@/lib/volunteers/serialize';
import { formatZodErrors, teamUpdateSchema } from '@/lib/volunteers/validation';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'ministries', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewVolunteers(auth.user) && !canManageAssignments(auth.user)) {
    return forbidden();
  }

  const { id } = await context.params;
  const row = await db.ministryTeam.findUnique({
    where: { id },
    include: {
      ...teamInclude,
      members: {
        include: {
          member: {
            select: {
              id: true,
              membershipNumber: true,
              displayName: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!row) return notFound('Ministry team');
  if (!canAccessTeam(auth.user, row)) return notFound('Ministry team');

  return success({
    ...serializeTeam(row),
    members: row.members.map((m) => ({
      id: m.id,
      memberId: m.memberId,
      roleLabel: m.roleLabel,
      status: m.status,
      startDate: m.startDate?.toISOString() ?? null,
      endDate: m.endDate?.toISOString() ?? null,
      member: {
        id: m.member.id,
        membershipNumber: m.member.membershipNumber,
        name:
          m.member.displayName ||
          `${m.member.user?.firstName || ''} ${m.member.user?.lastName || ''}`.trim() ||
          'Member',
      },
    })),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'ministries', 'assign');
  if (!auth.ok) return auth.error;
  if (!canManageAssignments(auth.user)) return forbidden();

  const parsed = teamUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.ministryTeam.findUnique({
    where: { id },
    include: { ministry: { select: { id: true, leaderUserId: true } } },
  });
  if (!existing) return notFound('Ministry team');
  if (!canAccessTeam(auth.user, existing)) return notFound('Ministry team');

  const updated = await db.ministryTeam.update({
    where: { id },
    data: {
      name:
        parsed.data.name === undefined
          ? undefined
          : sanitizePlainText(parsed.data.name, 120),
      description:
        parsed.data.description === undefined
          ? undefined
          : parsed.data.description
            ? sanitizePlainText(parsed.data.description, 2000)
            : null,
      leaderUserId:
        parsed.data.leaderUserId === undefined ? undefined : parsed.data.leaderUserId,
      assistantLeaderUserId:
        parsed.data.assistantLeaderUserId === undefined
          ? undefined
          : parsed.data.assistantLeaderUserId,
      departmentId:
        parsed.data.departmentId === undefined ? undefined : parsed.data.departmentId,
      isActive: parsed.data.isActive,
    },
    include: teamInclude,
  });

  return success(serializeTeam(updated), 'Ministry team updated.');
}
