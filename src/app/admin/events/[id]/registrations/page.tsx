import { EventRegistrationsAdmin } from '@/components/admin/events/EventRegistrations';
import { EventSubnav } from '@/components/admin/events/EventSubnav';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <EventSubnav eventId={id} />
      <EventRegistrationsAdmin />
    </div>
  );
}
