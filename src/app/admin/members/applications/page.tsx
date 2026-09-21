import { ApplicationsTable } from '@/components/admin/members/ApplicationsTable';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pending?: string }>;
}) {
  const { pending } = await searchParams;
  return <ApplicationsTable initialPending={pending === '1'} />;
}
