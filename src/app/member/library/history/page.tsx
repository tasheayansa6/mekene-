'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiDelete, apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

type ContinueItem = {
  progress: {
    sermonId: string;
    positionSeconds: number;
    durationSeconds: number | null;
    updatedAt: string;
  };
  sermon: {
    id: string;
    title: string;
    slug: string;
    sermonDate: string;
    speakerName: string | null;
  };
  href: string;
};

export default function MemberLibraryHistoryPage() {
  const [items, setItems] = useState<ContinueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function load() {
    const result = await apiGet<{ items: ContinueItem[] }>('/member/library/progress');
    if (!result.success) {
      setError(result.message);
      setItems([]);
      return;
    }
    setItems(result.data?.items || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function clearHistory() {
    setClearing(true);
    const result = await apiDelete('/member/library/progress');
    setClearing(false);
    setConfirmClear(false);
    if (result.success) {
      setItems([]);
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Playback history</h1>
          <p className="text-sm text-muted-foreground">Sermons you have started listening to or watching.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/member/library">My library</Link>
          </Button>
          {items && items.length > 0 ? (
            <Button variant="destructive" size="sm" onClick={() => setConfirmClear(true)}>
              Clear history
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!items ? <Skeleton className="h-40 w-full" /> : null}
      {items && items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No history yet</CardTitle>
            <CardDescription>Your playback progress will appear here as you listen.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href="/sermons">Browse sermons</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <ul className="space-y-3">
        {items?.map((item) => {
          const pct =
            item.progress.durationSeconds && item.progress.durationSeconds > 0
              ? Math.round((item.progress.positionSeconds / item.progress.durationSeconds) * 100)
              : null;
          return (
            <li key={item.progress.sermonId}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <Link className="hover:underline" href={item.href}>
                      {item.sermon.title}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    Last updated {new Date(item.progress.updatedAt).toLocaleString()}
                    {pct != null ? ` · ${pct}% complete` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild size="sm" variant="outline">
                    <Link href={item.href}>Resume</Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear playback history?"
        description="This removes all saved playback progress. Bookmarks are not affected."
        confirmLabel="Clear history"
        destructive
        loading={clearing}
        onConfirm={() => void clearHistory()}
      />
    </div>
  );
}
