import { EventHistoryPanel } from '@/components/admin/events/EventHistoryPanel';
import { EventSubnav } from '@/components/admin/events/EventSubnav';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGate permission="events.view">
      <div className="space-y-6">
        <PageHeader title="Change history" description="Schedule, venue, capacity, and status changes." />
        <EventSubnav eventId={id} />
        <EventHistoryPanel eventId={id} />
      </div>
    </PermissionGate>
  );
}
