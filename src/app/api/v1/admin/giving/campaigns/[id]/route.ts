import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canManageCampaigns } from '@/lib/giving/access';
import { campaignPatchSchema } from '@/lib/giving/validation';
import { parseMoney } from '@/lib/giving/money';
import { campaignRaisedAmount } from '@/lib/giving/write';
import { serializeCampaign } from '@/lib/giving/serialize';
import { emitGivingEvent } from '@/lib/giving/events';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'giving', 'publish');
  if (!auth.ok) return auth.error;
  if (!canManageCampaigns(auth.user)) return forbidden();

  const parsed = campaignPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.donationCampaign.findUnique({ where: { id } });
  if (!existing) return notFound('Campaign');

  const targetAmount =
    parsed.data.targetAmount === undefined
      ? undefined
      : parseMoney(parsed.data.targetAmount);
  if (parsed.data.targetAmount !== undefined && !targetAmount) {
    return error('Invalid target amount.', 400);
  }

  const updated = await db.donationCampaign.update({
    where: { id },
    data: {
      title: parsed.data.title,
      slug: parsed.data.slug,
      description:
        parsed.data.description === undefined ? undefined : parsed.data.description,
      targetAmount,
      startAt:
        parsed.data.startAt === undefined
          ? undefined
          : parsed.data.startAt
            ? new Date(parsed.data.startAt)
            : null,
      endAt:
        parsed.data.endAt === undefined
          ? undefined
          : parsed.data.endAt
            ? new Date(parsed.data.endAt)
            : null,
      status: parsed.data.status,
      coverImageUrl:
        parsed.data.coverImageUrl === undefined ? undefined : parsed.data.coverImageUrl,
      categoryId:
        parsed.data.categoryId === undefined ? undefined : parsed.data.categoryId,
      ministryId:
        parsed.data.ministryId === undefined ? undefined : parsed.data.ministryId,
    },
    include: {
      category: { select: { id: true, slug: true, name: true } },
      ministry: { select: { id: true, name: true, slug: true } },
    },
  });

  await emitGivingEvent({
    type: 'giving.campaign_updated',
    userId: auth.user.id,
    entityId: updated.id,
    request,
    details: { fields: Object.keys(parsed.data) },
  });

  return success({
    campaign: serializeCampaign(updated, await campaignRaisedAmount(updated.id)),
  });
}
