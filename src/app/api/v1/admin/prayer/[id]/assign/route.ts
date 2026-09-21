import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardPrayerAdminWrite } from '@/lib/prayer/guard';
import { canAssignPrayer } from '@/lib/prayer/access';
import { formatZodErrors, prayerAssignSchema } from '@/lib/prayer/validation';
import { logPrayerAudit } from '@/lib/prayer/audit';
import { prayerAdminInclude, serializeAdminDetail } from '@/lib/prayer/serialize';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardPrayerAdminWrite(request, 'assign');
  if (!auth.ok) return auth.error;
  if (!canAssignPrayer(auth.user)) return forbidden();

  const parsed = prayerAssignSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.prayerRequest.findUnique({ where: { id } });
  if (!existing) return notFound('Prayer request');

  let assignedToId = parsed.data.assignedToId;
  if (assignedToId) {
    const assignee = await db.user.findUnique({
      where: { id: assignedToId },
      select: { id: true },
    });
    if (!assignee) return notFound('User');
  }

  const updated = await db.prayerRequest.update({
    where: { id },
    data: {
      assignedToId,
      status: assignedToId
        ? existing.status === 'new' || existing.status === 'under_review'
          ? 'assigned'
          : existing.status
        : existing.status,
    },
    include: prayerAdminInclude,
  });

  await logPrayerAudit({
    type: 'prayer_request.assigned',
    requestId: id,
    userId: auth.user.id,
    request,
    details: { assignedToId, status: updated.status, previousStatus: existing.status },
  });

  return success(serializeAdminDetail(updated, auth.user), 'Assignment updated.');
}
