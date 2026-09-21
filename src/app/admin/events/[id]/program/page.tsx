import { EventProgramEditor } from '@/components/admin/events/EventProgramEditor';
import { EventSubnav } from '@/components/admin/events/EventSubnav';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGate permission="events.update">
      <div className="space-y-6">
        <PageHeader title="Service program" description="Build the order of worship or meeting agenda." />
        <EventSubnav eventId={id} />
        <EventProgramEditor eventId={id} />
      </div>
    </PermissionGate>
  );
}
