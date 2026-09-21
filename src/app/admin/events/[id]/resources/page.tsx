import { EventResourcesPanel } from '@/components/admin/events/EventResourcesPanel';
import { EventSubnav } from '@/components/admin/events/EventSubnav';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGate permission="events.update">
      <div className="space-y-6">
        <PageHeader title="Event resources" description="Reserve equipment and rooms for this event." />
        <EventSubnav eventId={id} />
        <EventResourcesPanel eventId={id} />
      </div>
    </PermissionGate>
  );
}
