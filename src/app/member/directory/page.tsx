'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface DirectoryRow {
  id: string;
  name: string;
  photo: string | null;
  ministries: Array<{ name: string }>;
  showContactButton: boolean;
}

export default function MemberDirectoryPage() {
  const [rows, setRows] = useState<DirectoryRow[] | null>(null);
  const [q, setQ] = useState('');

  async function load(search = '') {
    const result = await apiGet<DirectoryRow[]>('/members/directory', search ? { q: search } : undefined);
    setRows(result.data || []);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Member directory</h1>
        <p className="text-sm text-muted-foreground">
          Only names and ministries members chose to share. Contact details, addresses, giving, and attendance are never listed.
        </p>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void load(q);
        }}
      >
        <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search names" aria-label="Search directory" />
        <Button type="submit">Search</Button>
      </form>
      {rows === null ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No directory listings match your search.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 p-3 text-sm">
              {row.photo ? (
                <img src={row.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">{row.name.slice(0, 1)}</span>
              )}
              <div>
                <p className="font-medium">{row.name}</p>
                {row.ministries.length > 0 ? (
                  <p className="text-muted-foreground">{row.ministries.map((item) => item.name).join(', ')}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
