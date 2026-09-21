import { db } from '@/lib/db';
import { error, forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canManageAssignment } from '@/lib/volunteers/access';
import { assignmentInclude } from '@/lib/volunteers/serialize';
import { checkOutAssignment, VolunteerWriteError } from '@/lib/volunteers/write';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'ministries', 'assign');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const existing = await db.serviceAssignment.findUnique({
    where: { id },
    include: {
      ...assignmentInclude,
      team: { include: { ministry: { select: { id: true, leaderUserId: true } } } },
    },
  });
  if (!existing) return notFound('Service assignment');
  if (!canManageAssignment(auth.user, existing)) return forbidden();
  try {
    const result = await checkOutAssignment({
      assignmentId: id,
      staffUserId: auth.user.id,
    });
    return success({ assignment: result }, 'Checked out.');
  } catch (err) {
    if (err instanceof VolunteerWriteError) return error(err.message, 400);
    throw err;
  }
}
