'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  relatedUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell({
  viewAllHref = '/member/notifications',
  inboxHref,
}: {
  viewAllHref?: string;
  inboxHref?: string;
}) {
  const inbox = inboxHref || viewAllHref;
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    try {
      const res = await fetch('/api/v1/notifications?pageSize=8', { credentials: 'include' });
      if (!res.ok) return;
      const json = (await res.json()) as {
        data?: NotificationItem[];
        unreadCount?: number;
        meta?: { unreadCount?: number };
      };
      setItems(json.data || []);
      setUnreadCount(
        typeof json.unreadCount === 'number'
          ? json.unreadCount
          : typeof json.meta?.unreadCount === 'number'
            ? json.meta.unreadCount
            : (json.data || []).filter((row) => !row.readAt).length
      );
    } catch {
      /* ignore polling errors */
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, []);

  async function markRead(id: string) {
    await apiPost(`/notifications/${id}/read`).catch(() => null);
    await load();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          className="relative"
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,22rem)]">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex cursor-pointer flex-col items-start gap-1 py-2"
              onSelect={(event) => {
                event.preventDefault();
                void markRead(item.id);
                if (item.relatedUrl) window.location.href = item.relatedUrl;
              }}
            >
              <span className={`text-sm ${item.readAt ? 'font-normal' : 'font-semibold'}`}>{item.title}</span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{item.message}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={inbox}>View all</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
