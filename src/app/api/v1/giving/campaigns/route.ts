import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { campaignRaisedAmount } from '@/lib/giving/write';
import { serializeCampaign } from '@/lib/giving/serialize';

export async function GET() {
  const rows = await db.donationCampaign.findMany({
    where: { status: 'active' },
    include: {
      category: { select: { id: true, slug: true, name: true } },
      ministry: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { title: 'asc' },
  });

  const items = [];
  for (const row of rows) {
    const raised = await campaignRaisedAmount(row.id);
    items.push(serializeCampaign(row, raised));
  }

  return success({ campaigns: items, currency: 'ETB' });
}
