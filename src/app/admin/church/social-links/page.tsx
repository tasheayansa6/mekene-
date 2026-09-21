'use client';

import { PageHeader } from '@/components/admin/PageHeader';
import { SocialLinksTab } from '../_components/SocialLinksTab';

export default function ChurchSocialLinksPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Links"
        description="Manage public social media links."
      />
      <SocialLinksTab />
    </div>
  );
}
