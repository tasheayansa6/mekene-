import { ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function PermissionDenied({
  title = 'You do not have permission to access this section.',
  description = 'If you believe this is a mistake, contact a church administrator.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon={<ShieldAlert className="size-12" />}
      title={title}
      description={description}
      action={
        <Button asChild variant="outline">
          <Link href="/admin">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
