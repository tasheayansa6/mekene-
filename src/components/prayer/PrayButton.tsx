'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiPost } from '@/lib/api/client';
import { publicErrorMessage } from '@/lib/admin/http-error';

export function PrayButton({
  requestId,
  initialCount,
}: {
  requestId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pray() {
    setPending(true);
    setError(null);
    const result = await apiPost<{ prayedCount: number; alreadyPrayed: boolean }>(
      `/prayer/public/${requestId}/pray`,
      {}
    );
    setPending(false);
    if (!result.success || !result.data) {
      setError(publicErrorMessage(result.status, result.message));
      return;
    }
    setCount(result.data.prayedCount);
    setDone(true);
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={done ? 'secondary' : 'default'}
        onClick={() => void pray()}
        disabled={pending || done}
        aria-pressed={done}
      >
        <Heart className="mr-2 size-4" aria-hidden />
        {done ? 'Thank you' : 'I prayed'}
        <span className="ml-2 text-sm opacity-80">({count})</span>
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
