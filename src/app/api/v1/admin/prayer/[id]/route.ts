import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { guardPrayerAdminRead, guardPrayerAdminWrite } from '@/lib/prayer/guard';
import {
  allowedTeamStatus,
  canPermanentlyDeletePrayer,
  canUpdatePrayer,
} from '@/lib/prayer/access';
import { formatZodErrors, prayerPurgeSchema, prayerStatusPatchSchema } from '@/lib/prayer/validation';
import { logPrayerAudit } from '@/lib/prayer/audit';
import { prayerAdminInclude, serializeAdminDetail } from '@/lib/prayer/serialize';
import type { PrayerStatusValue } from '@/lib/prayer/status';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardPrayerAdminRead(request, 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const row = await db.prayerRequest.findUnique({
    where: { id },
    include: prayerAdminInclude,
  });
  if (!row) return notFound('Prayer request');
  return success(serializeAdminDetail(row, auth.user));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardPrayerAdminWrite(request, 'update');
  if (!auth.ok) return auth.error;
  if (!canUpdatePrayer(auth.user)) return forbidden();

  const parsed = prayerStatusPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.prayerRequest.findUnique({ where: { id } });
  if (!existing) return notFound('Prayer request');

  const data: {
    status?: PrayerStatusValue;
    categoryId?: string | null;
    requesterMessage?: string | null;
    answeredAt?: Date | null;
  } = {};

  if (parsed.data.status) {
    const allowed = allowedTeamStatus(auth.user, parsed.data.status);
    if (!allowed) return forbidden();
    data.status = allowed;
    if (allowed === 'answered') data.answeredAt = new Date();
  }
  if (parsed.data.categoryId !== undefined) {
    data.categoryId = parsed.data.categoryId;
  }
  if (parsed.data.requesterMessage !== undefined) {
    data.requesterMessage = parsed.data.requesterMessage
      ? sanitizePlainText(parsed.data.requesterMessage, 2000)
      : null;
  }

  const updated = await db.prayerRequest.update({
    where: { id },
    data,
    include: prayerAdminInclude,
  });

  if (data.status && data.status !== existing.status) {
    await logPrayerAudit({
      type: 'prayer_request.status_changed',
      requestId: id,
      userId: auth.user.id,
      request,
      details: { previousStatus: existing.status, status: data.status },
    });
  }

  return success(serializeAdminDetail(updated, auth.user), 'Prayer request updated.');
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardPrayerAdminWrite(request, 'delete');
  if (!auth.ok) return auth.error;
  if (!canPermanentlyDeletePrayer(auth.user)) return forbidden();

  const parsed = prayerPurgeSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return error('Permanent deletion requires explicit confirmation.', 422);
  }

  const { id } = await context.params;
  const existing = await db.prayerRequest.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return notFound('Prayer request');

  await db.prayerRequest.delete({ where: { id } });
  await logPrayerAudit({
    type: 'prayer_request.deleted',
    requestId: id,
    userId: auth.user.id,
    request,
    details: { status: 'deleted' },
  });
  return success({ id }, 'Prayer request permanently removed.');
}
