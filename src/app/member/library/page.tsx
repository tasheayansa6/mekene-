'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Clock, History } from 'lucide-react';
import { apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
    thumbnailUrl: string | null;
  };
  href: string;
};

export default function MemberLibraryPage() {
  const [items, setItems] = useState<ContinueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<{ items: ContinueItem[] }>('/member/library/continue').then((result) => {
      if (!result.success) {
        setError(result.message);
        setItems([]);
        return;
      }
      setItems(result.data?.items || []);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Library</h1>
        <p className="text-sm text-muted-foreground">
          Continue watching, saved favorites, and playback history.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bookmark className="size-4" />
              Favorites
            </CardTitle>
            <CardDescription>Sermons you saved for later.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/member/library/favorites">View favorites</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4" />
              History
            </CardTitle>
            <CardDescription>Playback progress across sermons.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/member/library/history">View history</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4" />
              Browse
            </CardTitle>
            <CardDescription>Explore the public library.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/library">Open library</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Continue watching</h2>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!items ? <Skeleton className="h-32 w-full" /> : null}
        {items && items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nothing in progress</CardTitle>
              <CardDescription>
                Start listening to a sermon and your progress will appear here.
              </CardDescription>
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
                      {new Date(item.sermon.sermonDate).toLocaleDateString()}
                      {item.sermon.speakerName ? ` · ${item.sermon.speakerName}` : ''}
                      {pct != null ? ` · ${pct}% complete` : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild size="sm">
                      <Link href={item.href}>Continue</Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
