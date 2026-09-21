import { MemberDetail } from '@/components/admin/members/MemberDetail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberDetail id={id} />;
}
