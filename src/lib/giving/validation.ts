import { z } from 'zod';
import {
  CAMPAIGN_STATUSES,
  PAYMENT_METHODS,
  PLEDGE_FREQUENCIES,
  PLEDGE_STATUSES,
} from './status';

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a positive decimal with up to 2 places');

export const publicGiveSchema = z.object({
  amount: moneyString,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .default('ETB'),
  categorySlug: z.string().trim().min(1).max(80),
  campaignSlug: z.string().trim().min(1).max(120).optional().nullable(),
  ministrySlug: z.string().trim().min(1).max(120).optional().nullable(),
  eventSlug: z.string().trim().min(1).max(120).optional().nullable(),
  isAnonymous: z.boolean().optional().default(false),
  note: z.string().trim().max(500).optional().nullable(),
  guestName: z.string().trim().min(2).max(120).optional().nullable(),
  guestEmail: z.string().trim().email().max(180).optional().nullable(),
  paymentMethod: z.enum(['online', 'bank_transfer']).optional().default('online'),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});

export const offlineContributionSchema = z.object({
  amount: moneyString,
  currency: z.literal('ETB').default('ETB'),
  categoryId: z.string().min(1),
  campaignId: z.string().min(1).optional().nullable(),
  ministryId: z.string().min(1).optional().nullable(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'other']),
  isAnonymous: z.boolean().optional().default(false),
  note: z.string().trim().max(500).optional().nullable(),
  offlineReference: z.string().trim().max(120).optional().nullable(),
  userId: z.string().min(1).optional().nullable(),
  memberId: z.string().min(1).optional().nullable(),
  guestName: z.string().trim().max(120).optional().nullable(),
  status: z.enum(['successful', 'pending']).optional().default('successful'),
});

export const refundSchema = z.object({
  amount: moneyString,
  reason: z.string().trim().min(3).max(400),
});

export const campaignCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  targetAmount: moneyString,
  currency: z.literal('ETB').default('ETB'),
  startAt: z.string().optional().nullable(),
  endAt: z.string().optional().nullable(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  categoryId: z.string().min(1).optional().nullable(),
  ministryId: z.string().min(1).optional().nullable(),
});

export const campaignPatchSchema = campaignCreateSchema.partial();

export const categoryUpsertSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(400).optional().nullable(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  minAmount: moneyString.optional(),
  maxAmount: moneyString.optional().nullable(),
  supportedCurrencies: z.array(z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/)).optional(),
  presetAmounts: z.array(moneyString).optional(),
  accountingCode: z.string().trim().max(40).optional().nullable(),
  ministryId: z.string().min(1).optional().nullable(),
  eventId: z.string().min(1).optional().nullable(),
});

export const categoryPatchSchema = categoryUpsertSchema.partial();

export const providerConfigPatchSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  environment: z.enum(['sandbox', 'production']).optional(),
  isEnabled: z.boolean().optional(),
  publicKey: z.string().trim().max(500).optional().nullable(),
  secretEnvKey: z
    .string()
    .trim()
    .max(80)
    .regex(/^[A-Z][A-Z0-9_]*$/)
    .optional()
    .nullable(),
  webhookPath: z.string().trim().max(200).optional().nullable(),
  supportedCurrencies: z.array(z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/)).optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const givingQrCreateSchema = z.object({
  label: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  targetType: z.enum(['general', 'fund', 'campaign', 'ministry', 'event']).default('general'),
  categorySlug: z.string().trim().max(80).optional().nullable(),
  campaignSlug: z.string().trim().max(120).optional().nullable(),
  ministrySlug: z.string().trim().max(120).optional().nullable(),
  eventSlug: z.string().trim().max(120).optional().nullable(),
  amountPreset: moneyString.optional().nullable(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional().nullable(),
});

export const givingSettingsPatchSchema = z.object({
  givingYearStartMonth: z.coerce.number().int().min(1).max(12).optional(),
  supportedCurrencies: z.array(z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/)).optional(),
  defaultCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
  legalChurchName: z.string().trim().max(200).optional().nullable(),
  registrationInfo: z.string().trim().max(500).optional().nullable(),
  donationTerms: z.string().trim().max(4000).optional().nullable(),
  refundPolicyNote: z.string().trim().max(2000).optional().nullable(),
  privacyNote: z.string().trim().max(2000).optional().nullable(),
});

export const pledgeCreateSchema = z.object({
  amount: moneyString,
  currency: z.literal('ETB').default('ETB'),
  frequency: z.enum(PLEDGE_FREQUENCIES).default('one_time'),
  campaignSlug: z.string().trim().min(1).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  startAt: z.string().optional().nullable(),
  endAt: z.string().optional().nullable(),
});

export const contributionListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  categoryId: z.string().optional(),
  campaignId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const pledgeStatusSchema = z.object({
  status: z.enum(PLEDGE_STATUSES),
});
