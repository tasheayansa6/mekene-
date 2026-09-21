import { EventForm } from '@/components/admin/events/EventForm';
import { EventSubnav } from '@/components/admin/events/EventSubnav';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <EventSubnav eventId={id} />
      <EventForm id={id} />
    </div>
  );
}
