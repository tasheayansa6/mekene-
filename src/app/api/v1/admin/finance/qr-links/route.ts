import { db } from '@/lib/db';
import { error, forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canManageCampaigns, canViewGiving } from '@/lib/giving/access';
import { givingQrCreateSchema } from '@/lib/giving/validation';
import {
  createGivingQrLink,
  givingQrAbsoluteUrl,
  qrSvgDataUrl,
} from '@/lib/giving/qr';
import { emitGivingEvent } from '@/lib/giving/events';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'giving', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGiving(auth.user)) return forbidden();

  const rows = await db.givingQrLink.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const links = await Promise.all(
    rows.map(async (row) => {
      const url = givingQrAbsoluteUrl(row.slug);
      return {
        id: row.id,
        slug: row.slug,
        label: row.label,
        targetType: row.targetType,
        categorySlug: row.categorySlug,
        campaignSlug: row.campaignSlug,
        ministrySlug: row.ministrySlug,
        eventSlug: row.eventSlug,
        amountPreset: row.amountPreset,
        currency: row.currency,
        isActive: row.isActive,
        url,
        qrDataUrl: await qrSvgDataUrl(url),
        createdAt: row.createdAt.toISOString(),
      };
    })
  );

  return success({ links });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'giving', 'publish');
  if (!auth.ok) return auth.error;
  if (!canManageCampaigns(auth.user)) return forbidden();

  const parsed = givingQrCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  try {
    const created = await createGivingQrLink({
      ...parsed.data,
      createdById: auth.user.id,
    });
    const url = givingQrAbsoluteUrl(created.slug);
    await emitGivingEvent({
      type: 'giving.qr_created',
      entityId: created.id,
      userId: auth.user.id,
      request,
      details: { slug: created.slug, targetType: created.targetType },
    });
    return success(
      {
        link: {
          id: created.id,
          slug: created.slug,
          label: created.label,
          url,
          qrDataUrl: await qrSvgDataUrl(url),
        },
      },
      'QR giving link created.',
      201
    );
  } catch {
    return error('Could not create QR link. Slug may already exist.', 400);
  }
}
