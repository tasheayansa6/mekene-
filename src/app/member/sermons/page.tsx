'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface SermonRow {
  id: string;
  title: string;
  slug: string;
  sermonDate: string;
  speakerName?: string | null;
  saved?: boolean;
}

export default function MemberSermonsPage() {
  const [rows, setRows] = useState<SermonRow[] | null>(null);
  const [q, setQ] = useState('');

  async function load(search = '') {
    const result = await apiGet<SermonRow[]>('/member/sermons', search ? { q: search } : undefined);
    setRows(result.data || []);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Sermons</h1>
        <p className="text-sm text-muted-foreground">Recent messages, search, and saved sermons.</p>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void load(q);
        }}
      >
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search sermons"
          aria-label="Search sermons"
        />
        <Button type="submit">Search</Button>
      </form>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/member/saved">Saved</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/member/library">Continue watching</Link>
        </Button>
      </div>
      {rows === null ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <Link className="underline" href={`/sermons/${row.slug}`}>
                {row.title}
              </Link>
              <Button
                size="sm"
                variant="outline"
                disabled={row.saved}
                onClick={() => void apiPost('/member/saved', { kind: 'sermon', entityId: row.id }).then(() => load(q))}
              >
                {row.saved ? 'Saved' : 'Save'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
