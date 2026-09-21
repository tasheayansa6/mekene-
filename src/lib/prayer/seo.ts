import { getSystemSettings } from '@/lib/admin/settings';

export async function prayerPageRobots() {
  const settings = await getSystemSettings();
  if (settings.prayerPublicIndex) {
    return { index: true, follow: true };
  }
  return {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  };
}
