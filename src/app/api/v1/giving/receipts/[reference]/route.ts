import { db } from '@/lib/db';
import { notFound, success, forbidden } from '@/lib/api/response';
import { churchConfig } from '@/config/church';
import { serializeReceipt } from '@/lib/giving/serialize';
import { optionalAuth } from '@/lib/auth/authorize';
import { canViewReceipt } from '@/lib/giving/receipt-access';

export async function GET(
  request: Request,
  context: { params: Promise<{ reference: string }> }
) {
  const { reference } = await context.params;
  const { user } = await optionalAuth(request);
  const row = await db.contribution.findUnique({
    where: { reference },
    include: {
      category: { select: { name: true } },
      campaign: { select: { title: true } },
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!row) return notFound('Receipt');
  if (!canViewReceipt(row, user)) return forbidden('You cannot view this receipt.');

  if (row.status !== 'successful' && row.status !== 'partially_refunded') {
    return success({
      pending: true,
      reference: row.reference,
      status: row.status,
      message: 'This contribution is not complete yet. A receipt will be available after success.',
    });
  }

  return success({
    receipt: serializeReceipt({
      ...row,
      churchName: churchConfig.branding.name,
    }),
  });
}
