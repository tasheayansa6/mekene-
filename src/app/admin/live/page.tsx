import { LiveTable } from '@/components/admin/live/LiveTable';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return <LiveTable initialStatus={status} />;
}
