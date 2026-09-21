import { db } from '@/lib/db';
import { notFound, success } from '@/lib/api/response';
import { campaignRaisedAmount } from '@/lib/giving/write';
import { serializeCampaign } from '@/lib/giving/serialize';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const row = await db.donationCampaign.findUnique({
    where: { slug },
    include: {
      category: { select: { id: true, slug: true, name: true } },
      ministry: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!row || row.status === 'draft' || row.status === 'archived') {
    return notFound('Campaign');
  }

  const raised = await campaignRaisedAmount(row.id);
  return success({ campaign: serializeCampaign(row, raised) });
}
