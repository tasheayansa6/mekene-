import { EventCheckInPanel } from '@/components/admin/events/EventCheckInPanel';
import { EventSubnav } from '@/components/admin/events/EventSubnav';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGate permission="events.assign">
      <div className="space-y-6">
        <PageHeader
          title="Event check-in"
          description="Scan or enter a registration reference. Attendee lists stay private."
        />
        <EventSubnav eventId={id} />
        <EventCheckInPanel eventId={id} />
      </div>
    </PermissionGate>
  );
}
