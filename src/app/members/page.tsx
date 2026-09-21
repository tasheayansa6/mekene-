'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { apiGet } from '@/lib/api/client';
import { PageHero } from '@/components/sections/PageHero';
import { Section } from '@/components/layout/Section';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DirectoryRow {
  id: string;
  name: string;
  photo: string | null;
  ministries: { name: string; slug: string }[];
  showContactButton: boolean;
}

export default function MembersDirectoryPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void apiGet<DirectoryRow[]>('/members/directory', q ? { q } : undefined).then((result) => {
      setRows(result.data || []);
      setLoading(false);
    });
  }, [q]);

  return (
    <div className="page-transition">
      <PageHero
        title="Member directory"
        description="Only members who opted into the directory appear here. Contact details stay private."
      />
      <Section>
        <div className="mx-auto mb-8 max-w-md space-y-2">
          <Label htmlFor="dir-search">Search</Label>
          <Input
            id="dir-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name"
          />
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !rows.length ? (
          <p className="text-muted-foreground">No directory entries are available.</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <li key={row.id} className="rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  {row.photo ? (
                    <Image
                      src={row.photo}
                      alt=""
                      width={56}
                      height={56}
                      className="size-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-14 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {row.name.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{row.name}</p>
                    {row.ministries.length ? (
                      <p className="text-sm text-muted-foreground">
                        {row.ministries.map((m) => m.name).join(', ')}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
