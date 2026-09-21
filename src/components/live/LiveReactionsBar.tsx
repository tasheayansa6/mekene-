'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiPost, ensureCsrfToken } from '@/lib/api/client';
import { ALLOWED_REACTIONS } from '@/lib/live/reactions';
import { Button } from '@/components/ui/button';

interface ReactionCounts {
  windowSeconds: number;
  counts: Record<string, number>;
}

export function LiveReactionsBar({
  slug,
  enabled,
  isLive,
  initial,
}: {
  slug: string;
  enabled: boolean;
  isLive: boolean;
  initial?: ReactionCounts | null;
}) {
  const [counts, setCounts] = useState<Record<string, number>>(initial?.counts || {});
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (initial?.counts) setCounts(initial.counts);
  }, [initial]);

  const heartbeat = useCallback(async () => {
    if (!isLive) return;
    await ensureCsrfToken();
    await apiPost(`/live/${slug}/presence`, {});
  }, [slug, isLive]);

  useEffect(() => {
    if (!enabled || !isLive) return;
    void heartbeat();
    const id = window.setInterval(() => void heartbeat(), 60_000);
    return () => window.clearInterval(id);
  }, [enabled, isLive, heartbeat]);

  if (!enabled) return null;

  async function react(emoji: string) {
    if (!isLive) return;
    setPending(emoji);
    await ensureCsrfToken();
    const result = await apiPost(`/live/${slug}/react`, { emoji });
    setPending(null);
    if (!result.success) {
      toast.error(result.message || 'Could not send reaction.');
      return;
    }
    setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Live reactions">
      {ALLOWED_REACTIONS.map((emoji) => (
        <Button
          key={emoji}
          type="button"
          variant="outline"
          size="sm"
          disabled={!isLive || pending === emoji}
          onClick={() => void react(emoji)}
          aria-label={`React with ${emoji}`}
          className="gap-2"
        >
          <span aria-hidden>{emoji}</span>
          <span className="tabular-nums text-muted-foreground">{counts[emoji] || 0}</span>
        </Button>
      ))}
      {!isLive ? (
        <span className="text-sm text-muted-foreground">Reactions are available during the live stream.</span>
      ) : null}
    </div>
  );
}
