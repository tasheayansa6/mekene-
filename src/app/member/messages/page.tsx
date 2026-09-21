'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api/client';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Conversation {
  id: string;
  subject: string | null;
  updatedAt: string;
  messages: Array<{ body: string; createdAt: string }>;
}

export default function MemberMessagesPage() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const result = await apiGet<Conversation[]>('/member/messages');
    setLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setItems(result.data || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createConversation(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    const result = await apiPost('/member/messages', { subject, body });
    setCreating(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setSubject('');
    setBody('');
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Messages</h1>
          <p className="text-sm text-muted-foreground">
            Contact church staff for support. Replies appear in this thread.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/member/notifications">Notifications</Link>
        </Button>
      </div>

      {error ? <ApiErrorAlert message={error} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Start a conversation</CardTitle>
          <CardDescription>Describe your question or request for the church office.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void createConversation(e)}>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                required
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? 'Sending…' : 'Send message'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No conversations yet</CardTitle>
            <CardDescription>Your support threads will appear here.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-3" aria-label="Your conversations">
          {items.map((item) => (
            <li key={item.id}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <Link href={`/member/messages/${item.id}`} className="hover:underline">
                      {item.subject || 'Support conversation'}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    Updated {new Date(item.updatedAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
