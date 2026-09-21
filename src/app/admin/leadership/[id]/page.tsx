'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { LeaderForm } from '../create/page';

export default function EditLeaderPage() {
  const params = useParams<{ id: string }>();
  return (
    <PermissionGate permission="leadership.update">
      <div className="space-y-6">
        <PageHeader title="Edit Leader" description="Update this leadership profile." />
        <LeaderForm id={params.id} />
      </div>
    </PermissionGate>
  );
}
