'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Conversation {
  id: string;
  subject: string | null;
  kind: string;
  updatedAt: string;
  messages: Array<{ body: string; createdAt: string }>;
}

export default function AdminMessagesPage() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<Conversation[]>('/admin/messages').then((result) => {
      setLoading(false);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setItems(result.data || []);
    });
  }, []);

  return (
    <PermissionGate permission="communications.view">
      <div className="space-y-6">
        <PageHeader
          title="Staff inbox"
          description="Support conversations where you are a participant."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/communications">Communications</Link>
            </Button>
          }
        />

        {error ? <ApiErrorAlert message={error} /> : null}

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No conversations</CardTitle>
              <CardDescription>Support threads assigned to you will appear here.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <ul className="space-y-3" aria-label="Staff inbox conversations">
            {items.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">
                        <Link href={`/admin/messages/${item.id}`} className="hover:underline">
                          {item.subject || 'Support conversation'}
                        </Link>
                      </CardTitle>
                      <Badge variant="outline">{item.kind}</Badge>
                    </div>
                    <CardDescription>
                      Updated {new Date(item.updatedAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  {item.messages[0] ? (
                    <CardContent className="text-sm text-muted-foreground line-clamp-2">
                      {item.messages[0].body}
                    </CardContent>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PermissionGate>
  );
}
