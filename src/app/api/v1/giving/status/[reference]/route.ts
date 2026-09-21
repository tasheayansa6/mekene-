import { db } from '@/lib/db';
import { error, success } from '@/lib/api/response';

export async function GET(
  _request: Request,
  context: { params: Promise<{ reference: string }> }
) {
  const { reference } = await context.params;
  const contribution = await db.contribution.findUnique({
    where: { reference },
    select: {
      reference: true,
      status: true,
      amount: true,
      currency: true,
      receiptNumber: true,
      completedAt: true,
      category: { select: { name: true } },
    },
  });
  if (!contribution) return error('Contribution not found.', 404);

  return success({
    reference: contribution.reference,
    status: contribution.status,
    amount: contribution.amount.toString(),
    currency: contribution.currency,
    receiptNumber: contribution.receiptNumber,
    completedAt: contribution.completedAt?.toISOString() ?? null,
    fund: contribution.category.name,
    isConfirmed:
      contribution.status === 'successful' || contribution.status === 'partially_refunded',
  });
}
