import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { canAccessTeam, canManageAssignments } from '@/lib/volunteers/access';
import { formatZodErrors, teamMemberCreateSchema } from '@/lib/volunteers/validation';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'ministries', 'assign');
  if (!auth.ok) return auth.error;
  if (!canManageAssignments(auth.user)) return forbidden();

  const parsed = teamMemberCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id: teamId } = await context.params;
  const team = await db.ministryTeam.findUnique({
    where: { id: teamId },
    include: { ministry: { select: { id: true, leaderUserId: true } } },
  });
  if (!team) return notFound('Ministry team');
  if (!canAccessTeam(auth.user, team)) return notFound('Ministry team');

  const member = await db.member.findUnique({
    where: { id: parsed.data.memberId },
    select: { id: true },
  });
  if (!member) return validationError({ memberId: ['Member not found'] });

  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
  const row = await db.ministryTeamMember.upsert({
    where: {
      teamId_memberId: { teamId, memberId: parsed.data.memberId },
    },
    create: {
      teamId,
      memberId: parsed.data.memberId,
      roleLabel: parsed.data.roleLabel
        ? sanitizePlainText(parsed.data.roleLabel, 80)
        : null,
      status: parsed.data.status || 'active',
      startDate: startDate && !Number.isNaN(startDate.getTime()) ? startDate : null,
    },
    update: {
      roleLabel: parsed.data.roleLabel
        ? sanitizePlainText(parsed.data.roleLabel, 80)
        : undefined,
      status: parsed.data.status || 'active',
      endDate: null,
    },
  });

  return success(
    {
      id: row.id,
      teamId: row.teamId,
      memberId: row.memberId,
      roleLabel: row.roleLabel,
      status: row.status,
      startDate: row.startDate?.toISOString() ?? null,
    },
    'Team member added.',
    201
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'ministries', 'assign');
  if (!auth.ok) return auth.error;
  if (!canManageAssignments(auth.user)) return forbidden();

  const body = (await readJson(request)) as {
    memberId?: string;
    status?: string;
    transferToTeamId?: string;
    roleLabel?: string | null;
  };
  const { id: teamId } = await context.params;
  const team = await db.ministryTeam.findUnique({
    where: { id: teamId },
    include: { ministry: { select: { id: true, leaderUserId: true } } },
  });
  if (!team) return notFound('Ministry team');
  if (!canAccessTeam(auth.user, team)) return notFound('Ministry team');
  if (!body.memberId) return validationError({ memberId: ['Required'] });

  if (body.transferToTeamId) {
    const dest = await db.ministryTeam.findUnique({
      where: { id: body.transferToTeamId },
      include: { ministry: { select: { id: true, leaderUserId: true } } },
    });
    if (!dest || !canAccessTeam(auth.user, dest)) return notFound('Ministry team');
    const { transferTeamMember } = await import('@/lib/volunteers/write');
    await transferTeamMember({
      fromTeamId: teamId,
      toTeamId: dest.id,
      memberId: body.memberId,
      roleLabel: body.roleLabel,
    });
    return success({ ok: true }, 'Member transferred.');
  }

  const status = (body.status || 'active').slice(0, 40);
  const row = await db.ministryTeamMember.update({
    where: { teamId_memberId: { teamId, memberId: body.memberId } },
    data: {
      status,
      endDate: status === 'active' ? null : new Date(),
      roleLabel:
        body.roleLabel === undefined
          ? undefined
          : body.roleLabel
            ? sanitizePlainText(body.roleLabel, 80)
            : null,
    },
  });
  return success(
    {
      id: row.id,
      memberId: row.memberId,
      status: row.status,
    },
    'Team membership updated.'
  );
}
