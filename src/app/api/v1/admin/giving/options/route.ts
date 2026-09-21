import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewGiving } from '@/lib/giving/access';
import { serializeCategory } from '@/lib/giving/serialize';
import { listPaymentProviders, getConfiguredProviderId } from '@/lib/giving/providers';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'giving', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGiving(auth.user)) return forbidden();

  const [categories, campaigns, ministries] = await Promise.all([
    db.donationCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    db.donationCampaign.findMany({
      select: { id: true, title: true, slug: true, status: true },
      orderBy: { title: 'asc' },
    }),
    db.ministry.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
      take: 200,
    }),
  ]);

  return success({
    categories: categories.map(serializeCategory),
    campaigns,
    ministries,
    providers: listPaymentProviders(),
    activeProvider: getConfiguredProviderId(),
    currency: 'ETB',
  });
}
