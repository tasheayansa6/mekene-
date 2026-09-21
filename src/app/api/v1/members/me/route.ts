import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { formatZodErrors } from '@/lib/auth/validation';
import { memberSelfPatchSchema } from '@/lib/members/validation';
import { memberSelfInclude, serializeMemberSelf } from '@/lib/members/serialize';
import { emitMembershipEvent } from '@/lib/members/events';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    include: memberSelfInclude,
  });

  if (!member) {
    return success({ member: null });
  }

  return success({
    member: serializeMemberSelf(member, auth.user),
  });
}

export async function PATCH(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = memberSelfPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const existing = await db.member.findUnique({ where: { userId: auth.user.id } });
  if (!existing) {
    return error('You do not have a church membership record yet.', 404);
  }

  const data = parsed.data;
  const updated = await db.member.update({
    where: { id: existing.id },
    data: {
      displayName: data.displayName === undefined ? undefined : data.displayName || null,
      preferredLanguage: data.preferredLanguage,
      directoryVisibility: data.directoryVisibility,
      showProfilePhoto: data.showProfilePhoto,
      showDisplayName: data.showDisplayName,
      showMinistry: data.showMinistry,
      showContactButton: data.showContactButton,
    },
    include: memberSelfInclude,
  });

  await emitMembershipEvent({
    type: 'membership.member_updated',
    userId: auth.user.id,
    entityId: updated.id,
    request,
    details: { fields: Object.keys(data) },
  });

  return success({ member: serializeMemberSelf(updated, auth.user) }, 'Profile updated.');
}
