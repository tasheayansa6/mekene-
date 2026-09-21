import { EventPreview } from '@/components/admin/events/EventPreview';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventPreview id={id} />;
}
