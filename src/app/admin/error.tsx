'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4">
      <ApiErrorAlert message="Something went wrong. Please try again." status={500} />
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
