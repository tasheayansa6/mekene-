import { SermonForm } from '@/components/admin/sermons/SermonForm';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SermonForm id={id} />;
}
