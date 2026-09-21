import { db } from '@/lib/db';
import { error, forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canManageCampaigns, canViewGiving } from '@/lib/giving/access';
import { campaignCreateSchema, campaignPatchSchema } from '@/lib/giving/validation';
import { parseMoney } from '@/lib/giving/money';
import { campaignRaisedAmount } from '@/lib/giving/write';
import { serializeCampaign } from '@/lib/giving/serialize';
import { emitGivingEvent } from '@/lib/giving/events';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'giving', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGiving(auth.user)) return forbidden();

  const rows = await db.donationCampaign.findMany({
    include: {
      category: { select: { id: true, slug: true, name: true } },
      ministry: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const items = [];
  for (const row of rows) {
    items.push(serializeCampaign(row, await campaignRaisedAmount(row.id)));
  }
  return success({ campaigns: items });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'giving', 'publish');
  if (!auth.ok) return auth.error;
  if (!canManageCampaigns(auth.user)) return forbidden();

  const parsed = campaignCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const targetAmount = parseMoney(parsed.data.targetAmount);
  if (!targetAmount) return error('Invalid target amount.', 400);

  const slug = parsed.data.slug || slugify(parsed.data.title);
  const created = await db.donationCampaign.create({
    data: {
      title: parsed.data.title,
      slug,
      description: parsed.data.description || null,
      targetAmount,
      currency: 'ETB',
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : null,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null,
      status: parsed.data.status || 'draft',
      coverImageUrl: parsed.data.coverImageUrl || null,
      categoryId: parsed.data.categoryId || null,
      ministryId: parsed.data.ministryId || null,
      createdById: auth.user.id,
    },
    include: {
      category: { select: { id: true, slug: true, name: true } },
      ministry: { select: { id: true, name: true, slug: true } },
    },
  });

  await emitGivingEvent({
    type: 'giving.campaign_created',
    userId: auth.user.id,
    entityId: created.id,
    request,
    details: { slug: created.slug, status: created.status },
  });

  return success(
    { campaign: serializeCampaign(created, await campaignRaisedAmount(created.id)) },
    'Campaign created.',
    201
  );
}
