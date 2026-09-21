import { MembersTable } from '@/components/admin/members/MembersTable';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return <MembersTable initialStatus={status} />;
}
