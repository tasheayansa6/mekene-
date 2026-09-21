'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api/client';
import type { ApiResponse } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

type ListResponse = ApiResponse<NotificationItem[]> & { unreadCount?: number };

export default function MemberNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const result = (await apiGet<NotificationItem[]>('/notifications', {
      page: '1',
      pageSize: '50',
    })) as ListResponse;
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setError(null);
    setItems(result.data || []);
    setUnreadCount(result.unreadCount ?? (result.data || []).filter((r) => !r.readAt).length);
  }

  useEffect(() => {
    void load();
  }, []);

  async function markAllRead() {
    await apiPost('/notifications/read-all', {});
    await load();
  }

  async function markRead(id: string) {
    await apiPost(`/notifications/${id}/read`, {});
    setItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, readAt: new Date().toISOString() } : row))
    );
    setUnreadCount((n) => Math.max(0, n - 1));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are up to date.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/member/settings/notifications">Preferences</Link>
          </Button>
          <Button variant="secondary" disabled={unreadCount === 0} onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        </div>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Unable to load</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No notifications</CardTitle>
            <CardDescription>
              Membership, giving, and church notices will appear here when available.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className={!item.readAt ? 'border-primary/40' : undefined}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  {!item.readAt ? <Badge>Unread</Badge> : null}
                  <Badge variant="outline">{item.type.replace(/_/g, ' ')}</Badge>
                </div>
                <CardDescription>
                  {new Date(item.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{item.message}</p>
                <div className="flex flex-wrap gap-2">
                  {!item.readAt ? (
                    <Button size="sm" variant="secondary" onClick={() => void markRead(item.id)}>
                      Mark read
                    </Button>
                  ) : null}
                  {item.relatedUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={item.relatedUrl}>Open</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
