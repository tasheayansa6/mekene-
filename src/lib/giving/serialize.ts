import { Decimal } from '@prisma/client/runtime/library';
import {
  campaignStatusLabel,
  contributionStatusLabel,
  countsTowardTotals,
  paymentMethodLabel,
} from './status';
import { moneyToString, netContributionAmount } from './money';
import { parseCurrencyList, parsePresetAmounts } from './currency';

export function serializeCategory(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isPublic?: boolean;
  sortOrder: number;
  minAmount: Decimal;
  maxAmount: Decimal | null;
  supportedCurrencies?: string;
  presetAmounts?: string | null;
  accountingCode?: string | null;
  ministryId?: string | null;
  eventId?: string | null;
  ministry?: { id: string; name: string; slug: string } | null;
  event?: { id: string; title: string; slug: string } | null;
}) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    isPublic: row.isPublic ?? true,
    sortOrder: row.sortOrder,
    minAmount: moneyToString(row.minAmount),
    maxAmount: row.maxAmount ? moneyToString(row.maxAmount) : null,
    supportedCurrencies: parseCurrencyList(row.supportedCurrencies),
    presetAmounts: parsePresetAmounts(row.presetAmounts),
    accountingCode: row.accountingCode ?? null,
    ministryId: row.ministryId ?? null,
    eventId: row.eventId ?? null,
    ministry: row.ministry ?? null,
    event: row.event
      ? { id: row.event.id, title: row.event.title, slug: row.event.slug }
      : null,
  };
}

export function serializeContribution(
  row: {
    id: string;
    reference: string;
    receiptNumber: string | null;
    amount: Decimal;
    currency: string;
    refundedAmount: Decimal;
    status: string;
    paymentMethod: string;
    isAnonymous: boolean;
    note: string | null;
    offlineReference: string | null;
    guestName: string | null;
    guestEmail: string | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    category?: { id: string; slug: string; name: string } | null;
    campaign?: { id: string; slug: string; title: string } | null;
    ministry?: { id: string; name: string; slug: string } | null;
    user?: { id: string; firstName: string; lastName: string; email: string } | null;
    recordedBy?: { id: string; firstName: string; lastName: string } | null;
  },
  options?: { includeDonor?: boolean }
) {
  const includeDonor = options?.includeDonor !== false;
  const net = netContributionAmount(row.amount, row.refundedAmount);
  return {
    id: row.id,
    reference: row.reference,
    receiptNumber: row.receiptNumber,
    amount: moneyToString(row.amount),
    refundedAmount: moneyToString(row.refundedAmount),
    netAmount: moneyToString(net),
    currency: row.currency,
    status: row.status,
    statusLabel: contributionStatusLabel(row.status),
    paymentMethod: row.paymentMethod,
    paymentMethodLabel: paymentMethodLabel(row.paymentMethod),
    isAnonymous: row.isAnonymous,
    note: row.note,
    offlineReference: row.offlineReference,
    countsTowardTotals: countsTowardTotals(row.status),
    category: row.category
      ? { id: row.category.id, slug: row.category.slug, name: row.category.name }
      : null,
    campaign: row.campaign
      ? { id: row.campaign.id, slug: row.campaign.slug, title: row.campaign.title }
      : null,
    ministry: row.ministry ?? null,
    donor:
      includeDonor && !row.isAnonymous
        ? row.user
          ? {
              id: row.user.id,
              name: `${row.user.firstName} ${row.user.lastName}`.trim(),
              email: row.user.email,
            }
          : row.guestName
            ? { id: null, name: row.guestName, email: row.guestEmail }
            : null
        : row.isAnonymous
          ? { anonymous: true }
          : null,
    recordedBy: row.recordedBy
      ? {
          id: row.recordedBy.id,
          name: `${row.recordedBy.firstName} ${row.recordedBy.lastName}`.trim(),
        }
      : null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeContributionSelf(
  row: Parameters<typeof serializeContribution>[0]
) {
  return serializeContribution(row, { includeDonor: false });
}

export function serializeCampaign(
  row: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    targetAmount: Decimal;
    currency: string;
    startAt: Date | null;
    endAt: Date | null;
    status: string;
    coverImageUrl: string | null;
    category?: { id: string; slug: string; name: string } | null;
    ministry?: { id: string; name: string; slug: string } | null;
    createdAt: Date;
    updatedAt: Date;
  },
  raised: Decimal
) {
  const target = new Decimal(row.targetAmount);
  const percent = target.gt(0)
    ? Math.min(100, Number(raised.div(target).mul(100).toFixed(1)))
    : 0;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    targetAmount: moneyToString(row.targetAmount),
    raisedAmount: moneyToString(raised),
    currency: row.currency,
    progressPercent: percent,
    startAt: row.startAt?.toISOString() ?? null,
    endAt: row.endAt?.toISOString() ?? null,
    status: row.status,
    statusLabel: campaignStatusLabel(row.status),
    coverImageUrl: row.coverImageUrl,
    category: row.category ?? null,
    ministry: row.ministry ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeReceipt(row: {
  reference: string;
  receiptNumber: string | null;
  amount: Decimal;
  currency: string;
  isAnonymous: boolean;
  completedAt: Date | null;
  createdAt: Date;
  category: { name: string };
  campaign?: { title: string } | null;
  user?: { firstName: string; lastName: string } | null;
  guestName?: string | null;
  churchName: string;
}) {
  const donorName = row.isAnonymous
    ? 'Anonymous donor'
    : row.user
      ? `${row.user.firstName} ${row.user.lastName}`.trim()
      : row.guestName || 'Donor';

  return {
    churchName: row.churchName,
    receiptNumber: row.receiptNumber,
    reference: row.reference,
    date: (row.completedAt || row.createdAt).toISOString(),
    amount: moneyToString(row.amount),
    currency: row.currency,
    contributionType: row.category.name,
    campaign: row.campaign?.title ?? null,
    donorName,
    isAnonymous: row.isAnonymous,
  };
}
