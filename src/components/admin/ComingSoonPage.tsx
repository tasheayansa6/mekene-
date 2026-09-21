import { ComingSoon } from '@/components/admin/ComingSoon';
import { PageHeader } from '@/components/admin/PageHeader';

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description="This module is planned and not implemented yet." />
      <ComingSoon title={`${title} is coming soon`} />
    </div>
  );
}
