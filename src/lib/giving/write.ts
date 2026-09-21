import { Decimal } from '@prisma/client/runtime/library';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/auth/tokens';
import { moneyEquals, moneyToString, netContributionAmount, parseMoney } from './money';
import { buildReference, nextReceiptNumber } from './receipts';
import { campaignAcceptsContributions } from './status';
import { getPaymentProvider } from './providers';
import { getAppUrl } from '@/lib/auth/config';
import { emitGivingEvent } from './events';

export const contributionInclude = {
  category: { select: { id: true, slug: true, name: true } },
  campaign: { select: { id: true, slug: true, title: true } },
  ministry: { select: { id: true, name: true, slug: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  recordedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

export async function campaignRaisedAmount(campaignId: string): Promise<Decimal> {
  const rows = await db.contribution.findMany({
    where: {
      campaignId,
      status: { in: ['successful', 'partially_refunded'] },
    },
    select: { amount: true, refundedAmount: true },
  });
  return rows.reduce(
    (sum, row) => sum.plus(netContributionAmount(row.amount, row.refundedAmount)),
    new Decimal(0)
  );
}

export async function validateAmountAgainstCategory(input: {
  categoryId: string;
  amount: Decimal;
}) {
  const category = await db.donationCategory.findUnique({ where: { id: input.categoryId } });
  if (!category || !category.isActive) {
    return { ok: false as const, error: 'Contribution type is not available.' };
  }
  if (input.amount.lt(category.minAmount)) {
    return {
      ok: false as const,
      error: `Minimum amount is ${moneyToString(category.minAmount)} ${category.slug ? 'ETB' : 'ETB'}.`,
    };
  }
  if (category.maxAmount && input.amount.gt(category.maxAmount)) {
    return {
      ok: false as const,
      error: `Maximum amount is ${moneyToString(category.maxAmount)} ETB.`,
    };
  }
  return { ok: true as const, category };
}

export async function markContributionSuccessful(input: {
  contributionId: string;
  transactionId?: string;
  providerReference?: string | null;
  request?: Request;
}) {
  const existing = await db.contribution.findUnique({
    where: { id: input.contributionId },
  });
  if (!existing) return null;
  if (existing.status === 'successful' || existing.status === 'partially_refunded') {
    return existing;
  }

  const receiptNumber = existing.receiptNumber || (await nextReceiptNumber());
  const updated = await db.contribution.update({
    where: { id: existing.id },
    data: {
      status: 'successful',
      receiptNumber,
      completedAt: existing.completedAt || new Date(),
    },
    include: contributionInclude,
  });

  if (input.transactionId) {
    await db.paymentTransaction.update({
      where: { id: input.transactionId },
      data: {
        status: 'successful',
        providerReference: input.providerReference || undefined,
        completedAt: new Date(),
        failureReason: null,
      },
    });
  }

  await emitGivingEvent({
    type: 'giving.contribution_successful',
    entityId: updated.id,
    userId: updated.userId,
    request: input.request,
    details: {
      reference: updated.reference,
      receiptNumber: updated.receiptNumber,
      amount: moneyToString(updated.amount),
      currency: updated.currency,
    },
  });

  try {
    const { postIncomeFromContribution } = await import('@/lib/finance/ledger');
    await postIncomeFromContribution(updated);
  } catch {
    // Ledger posting must not break giving success path.
  }

  return updated;
}

export async function createPublicContribution(input: {
  amount: string;
  currency: string;
  categorySlug: string;
  campaignSlug?: string | null;
  ministrySlug?: string | null;
  eventSlug?: string | null;
  isAnonymous?: boolean;
  note?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  paymentMethod?: 'online' | 'bank_transfer';
  idempotencyKey?: string;
  userId?: string | null;
  memberId?: string | null;
  request?: Request;
}) {
  if (input.idempotencyKey) {
    const existing = await db.contribution.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: contributionInclude,
    });
    if (existing) return { ok: true as const, contribution: existing, replay: true as const };
  }

  const amount = parseMoney(input.amount);
  if (!amount) return { ok: false as const, error: 'Invalid amount.' };

  const currency = (input.currency || 'ETB').toUpperCase();
  const { getGivingSettings, isSupportedCurrency, parseCurrencyList } = await import('./currency');
  const settings = await getGivingSettings();
  if (!isSupportedCurrency(currency, settings.supportedCurrencies)) {
    return { ok: false as const, error: `Currency ${currency} is not supported.` };
  }

  const category = await db.donationCategory.findFirst({
    where: { slug: input.categorySlug, isActive: true },
  });
  if (!category || (category as { isPublic?: boolean }).isPublic === false) {
    return { ok: false as const, error: 'Contribution type is not available.' };
  }

  const fundCurrencies = parseCurrencyList(category.supportedCurrencies);
  if (!isSupportedCurrency(currency, fundCurrencies)) {
    return { ok: false as const, error: `This fund does not accept ${currency}.` };
  }

  const amountCheck = await validateAmountAgainstCategory({
    categoryId: category.id,
    amount,
  });
  if (!amountCheck.ok) return amountCheck;

  let campaignId: string | null = null;
  let ministryId: string | null = category.ministryId;
  let eventId: string | null = category.eventId;
  if (input.campaignSlug) {
    const campaign = await db.donationCampaign.findUnique({
      where: { slug: input.campaignSlug },
    });
    if (!campaign || !campaignAcceptsContributions(campaign.status)) {
      return { ok: false as const, error: 'This campaign is not accepting contributions.' };
    }
    if (campaign.currency !== currency) {
      return { ok: false as const, error: 'Campaign currency mismatch.' };
    }
    campaignId = campaign.id;
    ministryId = campaign.ministryId || ministryId;
  }

  if (input.ministrySlug) {
    const ministry = await db.ministry.findFirst({
      where: { slug: input.ministrySlug, isActive: true },
    });
    if (!ministry) return { ok: false as const, error: 'Ministry not found.' };
    ministryId = ministry.id;
  }

  if (input.eventSlug) {
    const event = await db.event.findFirst({
      where: { slug: input.eventSlug, status: 'published' },
    });
    if (!event) return { ok: false as const, error: 'Event not found.' };
    eventId = event.id;
    if (event.ministryId) ministryId = event.ministryId;
  }

  const paymentMethod = input.paymentMethod || 'online';
  const reference = buildReference();
  const provider = getPaymentProvider();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const contribution = await db.contribution.create({
    data: {
      reference,
      amount,
      currency,
      status: 'pending',
      paymentMethod,
      isAnonymous: Boolean(input.isAnonymous),
      note: input.note || null,
      idempotencyKey: input.idempotencyKey || null,
      userId: input.userId || null,
      memberId: input.memberId || null,
      guestName: input.userId ? null : input.guestName || null,
      guestEmail: input.userId ? null : input.guestEmail || null,
      categoryId: category.id,
      campaignId,
      ministryId,
      eventId,
      expiresAt,
    },
    include: contributionInclude,
  });

  const txnKey = input.idempotencyKey
    ? `txn:${input.idempotencyKey}`
    : `txn:${generateToken(16)}`;

  const transaction = await db.paymentTransaction.create({
    data: {
      contributionId: contribution.id,
      provider: paymentMethod === 'online' ? provider.id : 'manual',
      idempotencyKey: txnKey,
      amount,
      currency,
      status: 'pending',
    },
  });

  let checkoutMessage =
    paymentMethod === 'bank_transfer'
      ? 'Bank transfer contribution recorded as pending. Finance staff will reconcile the transfer.'
      : 'Contribution created.';
  let redirectUrl: string | null = null;
  let mode: string = 'instructions';

  if (paymentMethod === 'online') {
    const checkout = await provider.createCheckout({
      contributionId: contribution.id,
      reference: contribution.reference,
      amount,
      currency,
      returnUrl: `${getAppUrl()}/give/success?ref=${contribution.reference}`,
      cancelUrl: `${getAppUrl()}/give/cancelled?ref=${contribution.reference}`,
      metadata: { reference: contribution.reference },
    });
    if (checkout.ok) {
      checkoutMessage = checkout.message;
      redirectUrl =
        checkout.redirectUrl ||
        (checkout.mode === 'pending_config'
          ? `${getAppUrl()}/give/pending?ref=${contribution.reference}`
          : null);
      mode = checkout.mode;
      if (checkout.providerReference) {
        await db.paymentTransaction.update({
          where: { id: transaction.id },
          data: { providerReference: checkout.providerReference },
        });
      }
    } else {
      checkoutMessage = checkout.error;
      mode = 'pending_config';
      redirectUrl = `${getAppUrl()}/give/pending?ref=${contribution.reference}`;
    }
  } else {
    redirectUrl = `${getAppUrl()}/give/pending?ref=${contribution.reference}`;
  }

  await emitGivingEvent({
    type: 'giving.contribution_created',
    userId: input.userId,
    entityId: contribution.id,
    request: input.request,
    details: {
      reference: contribution.reference,
      paymentMethod,
      amount: moneyToString(amount),
      currency,
    },
  });

  return {
    ok: true as const,
    contribution,
    transactionId: transaction.id,
    checkout: { message: checkoutMessage, redirectUrl, mode },
    replay: false as const,
  };
}

export async function createOfflineContribution(input: {
  amount: string;
  currency: string;
  categoryId: string;
  campaignId?: string | null;
  ministryId?: string | null;
  paymentMethod: 'cash' | 'bank_transfer' | 'other';
  isAnonymous?: boolean;
  note?: string | null;
  offlineReference?: string | null;
  userId?: string | null;
  memberId?: string | null;
  guestName?: string | null;
  status?: 'successful' | 'pending';
  recordedById: string;
  request?: Request;
}) {
  const amount = parseMoney(input.amount);
  if (!amount) return { ok: false as const, error: 'Invalid amount.' };
  if (input.currency !== 'ETB') return { ok: false as const, error: 'Only ETB is supported.' };

  const amountCheck = await validateAmountAgainstCategory({
    categoryId: input.categoryId,
    amount,
  });
  if (!amountCheck.ok) return amountCheck;

  if (input.campaignId) {
    const campaign = await db.donationCampaign.findUnique({ where: { id: input.campaignId } });
    if (!campaign) return { ok: false as const, error: 'Campaign not found.' };
  }

  const status = input.status || 'successful';
  const receiptNumber = status === 'successful' ? await nextReceiptNumber() : null;

  const contribution = await db.contribution.create({
    data: {
      reference: buildReference(),
      receiptNumber,
      amount,
      currency: 'ETB',
      status,
      paymentMethod: input.paymentMethod,
      isAnonymous: Boolean(input.isAnonymous),
      note: input.note || null,
      offlineReference: input.offlineReference || null,
      userId: input.userId || null,
      memberId: input.memberId || null,
      guestName: input.guestName || null,
      categoryId: input.categoryId,
      campaignId: input.campaignId || null,
      ministryId: input.ministryId || null,
      recordedById: input.recordedById,
      completedAt: status === 'successful' ? new Date() : null,
    },
    include: contributionInclude,
  });

  await db.paymentTransaction.create({
    data: {
      contributionId: contribution.id,
      provider: 'manual',
      providerReference: input.offlineReference || null,
      idempotencyKey: `manual:${contribution.id}`,
      amount,
      currency: 'ETB',
      status: status === 'successful' ? 'successful' : 'pending',
      completedAt: status === 'successful' ? new Date() : null,
    },
  });

  await emitGivingEvent({
    type:
      status === 'successful'
        ? 'giving.contribution_successful'
        : 'giving.contribution_created',
    userId: input.recordedById,
    entityId: contribution.id,
    request: input.request,
    details: {
      reference: contribution.reference,
      paymentMethod: input.paymentMethod,
      offline: true,
    },
  });

  if (status === 'successful') {
    try {
      const { postIncomeFromContribution } = await import('@/lib/finance/ledger');
      await postIncomeFromContribution(contribution, { createdById: input.recordedById });
    } catch {
      // Ledger posting must not break offline giving.
    }
  }

  return { ok: true as const, contribution };
}

export async function applyRefund(input: {
  contributionId: string;
  amount: string;
  reason: string;
  recordedById: string;
  request?: Request;
}) {
  const amount = parseMoney(input.amount);
  if (!amount) return { ok: false as const, error: 'Invalid refund amount.' };

  const contribution = await db.contribution.findUnique({
    where: { id: input.contributionId },
  });
  if (!contribution) return { ok: false as const, error: 'Contribution not found.' };
  if (
    contribution.status !== 'successful' &&
    contribution.status !== 'partially_refunded'
  ) {
    return { ok: false as const, error: 'Only successful contributions can be refunded.' };
  }

  const remaining = netContributionAmount(contribution.amount, contribution.refundedAmount);
  if (amount.gt(remaining)) {
    return { ok: false as const, error: 'Refund exceeds remaining amount.' };
  }

  const refundedAmount = new Decimal(contribution.refundedAmount).plus(amount);
  const fully = moneyEquals(refundedAmount, contribution.amount);
  const updated = await db.$transaction(async (tx) => {
    await tx.contributionRefund.create({
      data: {
        contributionId: contribution.id,
        amount,
        currency: contribution.currency,
        reason: input.reason,
        recordedById: input.recordedById,
      },
    });
    return tx.contribution.update({
      where: { id: contribution.id },
      data: {
        refundedAmount,
        status: fully ? 'refunded' : 'partially_refunded',
      },
      include: contributionInclude,
    });
  });

  await emitGivingEvent({
    type: 'giving.refund_recorded',
    userId: input.recordedById,
    entityId: contribution.id,
    request: input.request,
    details: {
      amount: moneyToString(amount),
      currency: contribution.currency,
      reason: input.reason,
    },
  });

  try {
    const { postRefundAdjustment } = await import('@/lib/finance/ledger');
    await postRefundAdjustment({
      contributionId: contribution.id,
      amount,
      currency: contribution.currency,
      fundId: contribution.categoryId,
      createdById: input.recordedById,
      description: `Refund for ${contribution.reference}`,
    });
  } catch {
    // Ledger posting must not break refund path.
  }

  return { ok: true as const, contribution: updated };
}

export async function processVerifiedWebhook(input: {
  provider: string;
  event: {
    eventKey: string;
    providerReference: string;
    contributionReference?: string | null;
    amount: string;
    currency: string;
    status: 'successful' | 'failed' | 'cancelled' | 'processing';
    summary: string;
  };
  request?: Request;
}) {
  const existingEvent = await db.paymentWebhookEvent.findUnique({
    where: {
      provider_eventKey: { provider: input.provider, eventKey: input.event.eventKey },
    },
  });
  if (existingEvent?.processingStatus === 'processed') {
    return { ok: true as const, duplicate: true as const };
  }

  const webhookRow = existingEvent
    ? existingEvent
    : await db.paymentWebhookEvent.create({
        data: {
          provider: input.provider,
          eventKey: input.event.eventKey,
          processingStatus: 'received',
          signatureValid: true,
          summary: input.event.summary,
        },
      });

  const transaction = await db.paymentTransaction.findFirst({
    where: {
      OR: [
        {
          provider: input.provider,
          providerReference: input.event.providerReference,
        },
        {
          contribution: {
            reference: input.event.contributionReference || undefined,
          },
          provider: input.provider,
        },
      ],
    },
    include: { contribution: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!transaction) {
    await db.paymentWebhookEvent.update({
      where: { id: webhookRow.id },
      data: { processingStatus: 'failed', summary: 'transaction_not_found' },
    });
    return { ok: false as const, error: 'Transaction not found.' };
  }

  if (
    !moneyEquals(transaction.amount, input.event.amount) ||
    transaction.currency !== input.event.currency.toUpperCase()
  ) {
    await db.paymentWebhookEvent.update({
      where: { id: webhookRow.id },
      data: { processingStatus: 'failed', summary: 'amount_or_currency_mismatch' },
    });
    return { ok: false as const, error: 'Amount or currency mismatch.' };
  }

  if (input.event.status === 'successful') {
    await markContributionSuccessful({
      contributionId: transaction.contributionId,
      transactionId: transaction.id,
      providerReference: input.event.providerReference,
      request: input.request,
    });
  } else if (input.event.status === 'failed' || input.event.status === 'cancelled') {
    await db.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: input.event.status === 'failed' ? 'failed' : 'cancelled',
        completedAt: new Date(),
        failureReason: input.event.summary,
        providerReference: input.event.providerReference,
      },
    });
    await db.contribution.update({
      where: { id: transaction.contributionId },
      data: {
        status: input.event.status === 'failed' ? 'failed' : 'cancelled',
      },
    });
  } else {
    await db.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'processing',
        providerReference: input.event.providerReference,
      },
    });
    await db.contribution.update({
      where: { id: transaction.contributionId },
      data: { status: 'processing' },
    });
  }

  await db.paymentWebhookEvent.update({
    where: { id: webhookRow.id },
    data: {
      processingStatus: 'processed',
      processedAt: new Date(),
      contributionId: transaction.contributionId,
      transactionId: transaction.id,
      summary: input.event.summary,
    },
  });

  await emitGivingEvent({
    type: 'giving.webhook_processed',
    entityId: transaction.contributionId,
    request: input.request,
    details: {
      provider: input.provider,
      eventKey: input.event.eventKey,
      status: input.event.status,
    },
  });

  return { ok: true as const, duplicate: false as const };
}
