import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canManageRefunds, canViewGiving } from '@/lib/giving/access';
import { refundSchema } from '@/lib/giving/validation';
import { serializeContribution } from '@/lib/giving/serialize';
import { applyRefund, contributionInclude } from '@/lib/giving/write';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'giving', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGiving(auth.user)) return forbidden();

  const { id } = await context.params;
  const row = await db.contribution.findUnique({
    where: { id },
    include: {
      ...contributionInclude,
      transactions: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          provider: true,
          providerReference: true,
          status: true,
          amount: true,
          currency: true,
          failureReason: true,
          initiatedAt: true,
          completedAt: true,
        },
      },
      refunds: {
        orderBy: { createdAt: 'desc' },
        include: {
          recordedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!row) return notFound('Contribution');

  return success({
    contribution: serializeContribution(row),
    transactions: row.transactions.map((txn) => ({
      ...txn,
      amount: txn.amount.toFixed(2),
      initiatedAt: txn.initiatedAt.toISOString(),
      completedAt: txn.completedAt?.toISOString() ?? null,
    })),
    refunds: row.refunds.map((item) => ({
      id: item.id,
      amount: item.amount.toFixed(2),
      currency: item.currency,
      reason: item.reason,
      createdAt: item.createdAt.toISOString(),
      recordedBy: item.recordedBy
        ? {
            id: item.recordedBy.id,
            name: `${item.recordedBy.firstName} ${item.recordedBy.lastName}`.trim(),
          }
        : null,
    })),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'giving', 'cancel');
  if (!auth.ok) return auth.error;
  if (!canManageRefunds(auth.user)) return forbidden();

  const parsed = refundSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const result = await applyRefund({
    contributionId: id,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
    recordedById: auth.user.id,
    request,
  });
  if (!result.ok) return error(result.error, 400);

  return success(
    { contribution: serializeContribution(result.contribution) },
    'Refund recorded.'
  );
}
