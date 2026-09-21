'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiDelete, apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type Bookmark = {
  id: string;
  createdAt: string;
  sermon: {
    id: string;
    title: string;
    slug: string;
    sermonDate: string;
    thumbnailUrl: string | null;
    speakerName: string | null;
  };
};

export default function MemberBookmarksPage() {
  const [rows, setRows] = useState<Bookmark[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await apiGet<Bookmark[]>('/member/bookmarks');
    if (!result.success) {
      setError(result.message);
      setRows([]);
      return;
    }
    setRows(result.data || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(id: string) {
    await apiDelete(`/member/bookmarks/${id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookmarks</h1>
          <p className="text-sm text-muted-foreground">Only you can see your saved sermons.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/sermons">Browse sermons</Link>
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!rows ? <Skeleton className="h-40 w-full" /> : null}
      {rows && rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No bookmarks yet</CardTitle>
            <CardDescription>Save a sermon from its detail page to find it here later.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      <ul className="space-y-3">
        {rows?.map((row) => (
          <li key={row.id}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    <Link className="hover:underline" href={`/sermons/${row.sermon.slug}`}>
                      {row.sermon.title}
                    </Link>
                  </CardTitle>
                  <Badge variant="outline">Saved</Badge>
                </div>
                <CardDescription>
                  {new Date(row.sermon.sermonDate).toLocaleDateString()}
                  {row.sermon.speakerName ? ` · ${row.sermon.speakerName}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/sermons/${row.sermon.slug}`}>Open</Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void remove(row.id)}>
                  Remove
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
