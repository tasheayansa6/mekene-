import { SermonPreview } from '@/components/admin/sermons/SermonPreview';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SermonPreview id={id} />;
}
