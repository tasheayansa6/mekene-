'use client';

import { PageHeader } from '@/components/admin/PageHeader';
import { ServicesTab } from '../_components/ServicesTab';

export default function ChurchServicesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Times"
        description="Create and update weekly service schedules."
      />
      <ServicesTab />
    </div>
  );
}
