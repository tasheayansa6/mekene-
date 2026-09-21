import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { serializeCategory } from '@/lib/giving/serialize';
import { getConfiguredProviderId, getPaymentProvider } from '@/lib/giving/providers';
import { getGivingSettings, parseCurrencyList } from '@/lib/giving/currency';

export async function GET() {
  const settings = await getGivingSettings();
  const categories = await db.donationCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  const publicFunds = categories.filter((row) => {
    const flag = (row as { isPublic?: boolean }).isPublic;
    return flag !== false;
  });
  const campaigns = await db.donationCampaign.findMany({
    where: { status: 'active' },
    select: { id: true, title: true, slug: true, currency: true },
    orderBy: { title: 'asc' },
    take: 50,
  });
  let ministries: Array<{ id: string; name: string; slug: string }> = [];
  try {
    ministries = await db.ministry.findMany({
      where: { isActive: true, status: 'published' },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
      take: 40,
    });
  } catch {
    ministries = [];
  }
  const provider = getPaymentProvider();

  return success({
    categories: publicFunds.map(serializeCategory),
    funds: publicFunds.map(serializeCategory),
    campaigns,
    ministries,
    currency: settings.defaultCurrency || 'ETB',
    supportedCurrencies: parseCurrencyList(settings.supportedCurrencies),
    presets: ['100', '250', '500', '1000'],
    provider: {
      id: getConfiguredProviderId(),
      displayName: provider.displayName,
      onlineCheckoutAvailable: provider.supportsOnlineCheckout,
      recurringAvailable: provider.supportsRecurring,
    },
    terms: {
      donationTerms: settings.donationTerms,
      refundPolicyNote: settings.refundPolicyNote,
      privacyNote: settings.privacyNote,
    },
  });
}
