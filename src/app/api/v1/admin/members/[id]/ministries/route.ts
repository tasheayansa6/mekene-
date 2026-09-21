import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canManageMemberMinistries, memberByIdWhere } from '@/lib/members/access';
import { memberMinistrySchema } from '@/lib/members/validation';
import { formatZodErrors } from '@/lib/auth/validation';
import { emitMembershipEvent } from '@/lib/members/events';
import { readJson } from '@/lib/auth/http';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'members', 'update');
  if (!auth.ok) return auth.error;
  if (!canManageMemberMinistries(auth.user)) return forbidden();

  const parsed = memberMinistrySchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const member = await db.member.findFirst({ where: memberByIdWhere(auth.user, id) });
  if (!member) return notFound('Member');

  const ministry = await db.ministry.findUnique({ where: { id: parsed.data.ministryId } });
  if (!ministry) return notFound('Ministry');

  const participation = await db.memberMinistry.upsert({
    where: { memberId_ministryId: { memberId: member.id, ministryId: ministry.id } },
    create: {
      memberId: member.id,
      ministryId: ministry.id,
      roleLabel: parsed.data.roleLabel || null,
      status: parsed.data.status || 'active',
      joinedAt: new Date(),
    },
    update: {
      roleLabel: parsed.data.roleLabel === undefined ? undefined : parsed.data.roleLabel || null,
      status: parsed.data.status,
    },
  });

  await emitMembershipEvent({
    type: 'membership.ministry_changed',
    userId: auth.user.id,
    entityId: member.id,
    request,
    details: { memberId: member.id, ministryId: ministry.id, status: participation.status },
  });

  return success({ participation }, 'Ministry participation updated.');
}
