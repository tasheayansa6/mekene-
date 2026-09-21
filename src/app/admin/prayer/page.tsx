import { PrayerTable } from '@/components/admin/prayer/PrayerTable';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return <PrayerTable initialStatus={status} />;
}
