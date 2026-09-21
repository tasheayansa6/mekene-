import { db } from '@/lib/db';
import { notFound, success } from '@/lib/api/response';
import { guardPrayerAdminWrite } from '@/lib/prayer/guard';
import { logPrayerAudit } from '@/lib/prayer/audit';
import { prayerAdminInclude, serializeAdminDetail } from '@/lib/prayer/serialize';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardPrayerAdminWrite(request, 'moderate');
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const existing = await db.prayerRequest.findUnique({ where: { id } });
  if (!existing) return notFound('Prayer request');

  const now = new Date();
  const nextStatus =
    existing.status === 'new' || existing.status === 'rejected' ? 'under_review' : existing.status;

  const updated = await db.prayerRequest.update({
    where: { id },
    data: {
      publicApproved: existing.visibility === 'public',
      approvedAt: now,
      rejectedAt: null,
      status: nextStatus,
    },
    include: prayerAdminInclude,
  });

  await logPrayerAudit({
    type: 'prayer_request.approved',
    requestId: id,
    userId: auth.user.id,
    request,
    details: {
      previousStatus: existing.status,
      status: updated.status,
      visibility: updated.visibility,
      publicApproved: updated.publicApproved,
    },
  });

  return success(serializeAdminDetail(updated, auth.user), 'Request approved.');
}
