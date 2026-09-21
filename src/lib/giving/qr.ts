import QRCode from 'qrcode';
import { db } from '@/lib/db';
import { getAppUrl } from '@/lib/auth/config';
import type { GivingQrTargetType } from '@prisma/client';

export function buildGivePath(input: {
  categorySlug?: string | null;
  campaignSlug?: string | null;
  ministrySlug?: string | null;
  eventSlug?: string | null;
  amount?: string | null;
  currency?: string | null;
}): string {
  const params = new URLSearchParams();
  if (input.categorySlug) params.set('fund', input.categorySlug);
  if (input.campaignSlug) params.set('campaign', input.campaignSlug);
  if (input.ministrySlug) params.set('ministry', input.ministrySlug);
  if (input.eventSlug) params.set('event', input.eventSlug);
  if (input.amount) params.set('amount', input.amount);
  if (input.currency) params.set('currency', input.currency);
  const qs = params.toString();
  return qs ? `/give/now?${qs}` : '/give/now';
}

export function givingQrPublicPath(slug: string): string {
  return `/give/q/${slug}`;
}

export function givingQrAbsoluteUrl(slug: string): string {
  return `${getAppUrl()}${givingQrPublicPath(slug)}`;
}

export async function resolveGivingQr(slug: string) {
  const row = await db.givingQrLink.findUnique({ where: { slug } });
  if (!row || !row.isActive) return null;
  return {
    row,
    path: buildGivePath({
      categorySlug: row.categorySlug,
      campaignSlug: row.campaignSlug,
      ministrySlug: row.ministrySlug,
      eventSlug: row.eventSlug,
      amount: row.amountPreset,
      currency: row.currency,
    }),
  };
}

export async function createGivingQrLink(input: {
  label: string;
  slug?: string;
  targetType: GivingQrTargetType;
  categorySlug?: string | null;
  campaignSlug?: string | null;
  ministrySlug?: string | null;
  eventSlug?: string | null;
  amountPreset?: string | null;
  currency?: string | null;
  createdById?: string | null;
}) {
  const slug =
    input.slug?.trim() ||
    input.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) ||
    `give-${Date.now().toString(36)}`;

  return db.givingQrLink.create({
    data: {
      slug,
      label: input.label.trim(),
      targetType: input.targetType,
      categorySlug: input.categorySlug || null,
      campaignSlug: input.campaignSlug || null,
      ministrySlug: input.ministrySlug || null,
      eventSlug: input.eventSlug || null,
      amountPreset: input.amountPreset || null,
      currency: input.currency || null,
      createdById: input.createdById || null,
    },
  });
}

/** Real QR SVG data URL for a public giving link — never encodes payment credentials. */
export async function qrSvgDataUrl(text: string, size = 192): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: size,
    type: 'image/png',
  });
}
