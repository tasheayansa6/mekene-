import { ContentForm } from '@/components/admin/content/ContentForm';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContentForm kind="resources" id={id} />;
}
