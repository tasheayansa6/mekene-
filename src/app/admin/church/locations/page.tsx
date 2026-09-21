'use client';

import { PageHeader } from '@/components/admin/PageHeader';
import { LocationsTab } from '../_components/LocationsTab';

export default function ChurchLocationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Manage church campuses and gathering places."
      />
      <LocationsTab />
    </div>
  );
}
