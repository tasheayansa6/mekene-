'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Badge } from '@/components/ui/badge';

interface AnnouncementRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  priority: string;
  category: string;
  startAt: string;
  read: boolean;
}

export default function MemberAnnouncementsPage() {
  const [rows, setRows] = useState<AnnouncementRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await apiGet<AnnouncementRow[]>('/member/announcements', { pageSize: '40' });
    setRows(result.data || []);
    setError(result.success ? null : result.message);
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead(id: string) {
    await apiPost(`/member/announcements/${id}/read`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Announcements</h1>
        <p className="text-sm text-muted-foreground">Church, ministry, and service notices for you.</p>
      </div>
      {error ? <ApiErrorAlert message={error} /> : null}
      {rows === null ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements right now.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-medium">{row.title}</h2>
                {row.read ? null : <Badge>Unread</Badge>}
                {row.priority !== 'normal' ? <Badge variant="secondary">{row.priority}</Badge> : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{row.excerpt}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm">{row.content}</p>
              {!row.read ? (
                <Button className="mt-3" size="sm" variant="outline" onClick={() => void markRead(row.id)}>
                  Mark as read
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
