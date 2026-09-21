import { SessionForm } from '@/components/admin/attendance/SessionForm';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionForm id={id} />;
}
