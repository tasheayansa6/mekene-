'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Button } from '@/components/ui/button';
import { MinistryForm } from '../create/page';

export default function EditMinistryPage() {
  const params = useParams<{ id: string }>();
  return (
    <PermissionGate permission="ministries.view">
      <div className="space-y-6">
        <PageHeader
          title="Edit Ministry"
          description="Update this ministry."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/admin/ministry/teams?ministryId=${params.id}`}>Teams</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/ministry/assignments">Assignments</Link>
              </Button>
            </div>
          }
        />
        <MinistryForm id={params.id} />
      </div>
    </PermissionGate>
  );
}
