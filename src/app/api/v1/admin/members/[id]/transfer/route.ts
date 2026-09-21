import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canManageTransfers, memberByIdWhere } from '@/lib/members/access';
import { canTransitionMembership } from '@/lib/members/status';
import { recordStatusHistory } from '@/lib/members/write';
import { emitMembershipEvent } from '@/lib/members/events';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

type RouteContext = { params: Promise<{ id: string }> };

const createSchema = z.object({
  direction: z.enum(['transfer_in', 'transfer_out']),
  otherChurchName: z.string().trim().max(200).nullable().optional(),
  otherChurchNote: z.string().trim().max(500).nullable().optional(),
  reason: z.string().trim().max(500).nullable().optional(),
  effectiveDate: z.string().optional().nullable(),
});

const patchSchema = z.object({
  transferId: z.string().min(1),
  action: z.enum(['approve', 'reject', 'complete', 'cancel']),
});

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  if (!canManageTransfers(auth.user)) return forbidden();
  const { id } = await context.params;
  const member = await db.member.findFirst({ where: memberByIdWhere(auth.user, id) });
  if (!member) return notFound('Member');
  const rows = await db.membershipTransfer.findMany({
    where: { memberId: id },
    orderBy: { createdAt: 'desc' },
  });
  return success(rows);
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'members', 'approve');
  if (!auth.ok) return auth.error;
  if (!canManageTransfers(auth.user)) return forbidden();
  const { id } = await context.params;
  const member = await db.member.findFirst({ where: memberByIdWhere(auth.user, id) });
  if (!member) return notFound('Member');
  const body = await readJson(request);

  if (body && typeof body === 'object' && 'action' in (body as object)) {
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return validationError(formatZodErrors(parsed.error));
    const transfer = await db.membershipTransfer.findFirst({
      where: { id: parsed.data.transferId, memberId: id },
    });
    if (!transfer) return notFound('Transfer');

    let status = transfer.status;
    if (parsed.data.action === 'approve') status = 'approved';
    if (parsed.data.action === 'reject') status = 'rejected';
    if (parsed.data.action === 'cancel') status = 'cancelled';
    if (parsed.data.action === 'complete') status = 'completed';

    const updated = await db.membershipTransfer.update({
      where: { id: transfer.id },
      data: {
        status,
        reviewedById: auth.user.id,
        reviewedAt: new Date(),
      },
    });

    if (parsed.data.action === 'complete' && transfer.direction === 'transfer_out') {
      if (!canTransitionMembership(member.status, 'transferred')) {
        return error('Cannot mark member as transferred from current status.', 409);
      }
      await db.member.update({
        where: { id },
        data: { status: 'transferred' },
      });
      await recordStatusHistory({
        memberId: id,
        oldStatus: member.status,
        newStatus: 'transferred',
        changedById: auth.user.id,
        reason: 'Membership transfer completed',
      });
      await emitMembershipEvent({
        type: 'membership.status_changed',
        userId: auth.user.id,
        entityId: id,
        request,
        details: { to: 'transferred' },
      });
    }

    await emitMembershipEvent({
      type: 'membership.transfer_updated',
      userId: auth.user.id,
      entityId: updated.id,
      request,
      details: { status },
    });
    return success(updated, 'Transfer updated.');
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const effectiveDate = parsed.data.effectiveDate ? new Date(parsed.data.effectiveDate) : null;
  const row = await db.membershipTransfer.create({
    data: {
      memberId: id,
      direction: parsed.data.direction,
      status: 'requested',
      otherChurchName: parsed.data.otherChurchName
        ? sanitizePlainText(parsed.data.otherChurchName, 200)
        : null,
      otherChurchNote: parsed.data.otherChurchNote
        ? sanitizePlainText(parsed.data.otherChurchNote, 500)
        : null,
      reason: parsed.data.reason ? sanitizePlainText(parsed.data.reason, 500) : null,
      effectiveDate,
    },
  });
  return success(row, 'Transfer request created.', 201);
}
