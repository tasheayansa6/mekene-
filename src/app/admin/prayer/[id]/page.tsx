import { PrayerAdminDetail } from '@/components/admin/prayer/PrayerAdminDetail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PrayerAdminDetail id={id} />;
}
