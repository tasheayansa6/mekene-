'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiDelete, apiGet } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface SavedRow {
  id: string;
  kind: string;
  title: string;
  href: string;
}

export default function MemberSavedPage() {
  const [rows, setRows] = useState<SavedRow[] | null>(null);

  async function load() {
    const result = await apiGet<SavedRow[]>('/member/saved');
    setRows(result.data || []);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Saved content</h1>
        <p className="text-sm text-muted-foreground">Sermons, resources, events, and pages you saved.</p>
      </div>
      {rows === null ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <Link className="underline" href={row.href}>
                {row.title}
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void apiDelete(`/member/saved/${row.id}`).then(() => load())}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant="ghost">
        <Link href="/member/bookmarks">Sermon bookmarks</Link>
      </Button>
    </div>
  );
}
