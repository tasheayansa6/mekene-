import { EventTable } from '@/components/admin/events/EventTable';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return <EventTable initialStatus={status} />;
}
