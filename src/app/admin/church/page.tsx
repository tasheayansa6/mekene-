'use client';

import { PageHeader } from '@/components/admin/PageHeader';
import { ProfileTab } from './_components/ProfileTab';

export default function ChurchInformationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Church Information"
        description="Manage the public church profile. These fields are stored on the church profile, not duplicated in system settings."
      />
      <ProfileTab />
    </div>
  );
}
