import { Construction } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

export function ComingSoon({
  title = 'Coming Soon',
  description = 'This module will be available in a later phase. It is listed here so the administration structure is ready.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon={<Construction className="size-12" />}
      title={title}
      description={description}
    />
  );
}
