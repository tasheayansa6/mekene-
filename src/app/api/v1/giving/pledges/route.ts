import { error, forbidden, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { pledgeCreateSchema } from '@/lib/giving/validation';
import { parseMoney, moneyToString } from '@/lib/giving/money';
import { db } from '@/lib/db';
import { emitGivingEvent } from '@/lib/giving/events';
import { getPaymentProvider } from '@/lib/giving/providers';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const rows = await db.pledge.findMany({
    where: { userId: auth.user.id },
    include: {
      campaign: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return success({
    pledges: rows.map((row) => ({
      id: row.id,
      amount: moneyToString(row.amount),
      currency: row.currency,
      frequency: row.frequency,
      status: row.status,
      campaign: row.campaign,
      note: row.note,
      startAt: row.startAt?.toISOString() ?? null,
      endAt: row.endAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    recurringSupported: getPaymentProvider().supportsRecurring,
  });
}

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = pledgeCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const amount = parseMoney(parsed.data.amount);
  if (!amount) return error('Invalid amount.', 400);

  if (parsed.data.frequency !== 'one_time' && !getPaymentProvider().supportsRecurring) {
    // Record pledge intent only — do not fake auto-charging.
  }

  let campaignId: string | null = null;
  if (parsed.data.campaignSlug) {
    const campaign = await db.donationCampaign.findUnique({
      where: { slug: parsed.data.campaignSlug },
    });
    if (!campaign || campaign.status === 'archived') {
      return error('Campaign not found.', 404);
    }
    campaignId = campaign.id;
  }

  const member = await db.member.findUnique({ where: { userId: auth.user.id } });
  const pledge = await db.pledge.create({
    data: {
      userId: auth.user.id,
      memberId: member?.id || null,
      campaignId,
      amount,
      currency: 'ETB',
      frequency: parsed.data.frequency,
      status: 'active',
      note: parsed.data.note || null,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : new Date(),
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null,
    },
  });

  await emitGivingEvent({
    type: 'giving.pledge_created',
    userId: auth.user.id,
    entityId: pledge.id,
    request,
    details: {
      amount: moneyToString(amount),
      frequency: pledge.frequency,
      autoCharge: false,
    },
  });

  return success(
    {
      pledge: {
        id: pledge.id,
        amount: moneyToString(pledge.amount),
        currency: pledge.currency,
        frequency: pledge.frequency,
        status: pledge.status,
      },
      message:
        pledge.frequency === 'one_time'
          ? 'Pledge recorded. A pledge is not a completed contribution until payment succeeds.'
          : 'Recurring pledge intent recorded. Automatic charging is not enabled until a provider subscription adapter is configured.',
    },
    'Pledge created.',
    201
  );
}
