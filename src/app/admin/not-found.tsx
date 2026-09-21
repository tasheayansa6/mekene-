import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="This administration page does not exist."
      action={
        <Button asChild>
          <Link href="/admin">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
