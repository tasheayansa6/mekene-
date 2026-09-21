import { PastoralCaseDetail } from '@/components/admin/pastoral/PastoralCaseDetail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PastoralCaseDetail id={id} />;
}
