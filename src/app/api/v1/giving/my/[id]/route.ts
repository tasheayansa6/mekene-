import { db } from '@/lib/db';
import { error, notFound, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { churchConfig } from '@/config/church';
import { serializeReceipt, serializeContributionSelf } from '@/lib/giving/serialize';
import { contributionInclude } from '@/lib/giving/write';
import { sendContributionReceiptEmail } from '@/lib/giving/email';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const row = await db.contribution.findFirst({
    where: { id, userId: auth.user.id },
    include: contributionInclude,
  });
  if (!row) return notFound('Contribution');

  return success({ contribution: serializeContributionSelf(row) });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const row = await db.contribution.findFirst({
    where: { id, userId: auth.user.id },
    include: {
      category: { select: { name: true } },
      campaign: { select: { title: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  if (!row) return notFound('Contribution');
  if (row.status !== 'successful' && row.status !== 'partially_refunded') {
    return error('Receipt is available only after a successful contribution.', 409);
  }

  if (row.user?.email) {
    await sendContributionReceiptEmail({
      to: row.user.email,
      receiptNumber: row.receiptNumber,
      reference: row.reference,
      amount: row.amount.toFixed(2),
      currency: row.currency,
      contributionType: row.category.name,
      campaignTitle: row.campaign?.title,
      isAnonymous: row.isAnonymous,
    });
  }

  return success({
    receipt: serializeReceipt({
      ...row,
      churchName: churchConfig.branding.name,
    }),
    emailed: Boolean(row.user?.email),
  });
}
