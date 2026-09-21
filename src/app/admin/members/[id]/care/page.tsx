import { MemberCarePanel } from '@/components/admin/members/MemberCarePanel';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberCarePanel memberId={id} />;
}
