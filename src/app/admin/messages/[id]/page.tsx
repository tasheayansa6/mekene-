'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
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

interface Message {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; firstName: string | null; lastName: string | null };
}

interface ConversationDetail {
  conversation: {
    id: string;
    subject: string | null;
    messages: Message[];
    participants: Array<{
      roleLabel: string | null;
      user: { firstName: string | null; lastName: string | null };
    }>;
  };
}

export default function AdminMessageThreadPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ConversationDetail | null>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!params.id) return;
    const result = await apiGet<ConversationDetail>(`/admin/messages/${params.id}`);
    if (!result.success || !result.data) {
      setError(result.message);
      return;
    }
    setData(result.data);
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!params.id) return;
    setSaving(true);
    setError(null);
    const result = await apiPost(`/admin/messages/${params.id}`, { body });
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setBody('');
    await load();
  }

  const conversation = data?.conversation;

  return (
    <PermissionGate permission="communications.view">
      <div className="space-y-6">
        <PageHeader
          title={conversation?.subject || 'Conversation'}
          description="Reply as staff. Messages are visible to all participants."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/messages">Inbox</Link>
            </Button>
          }
        />

        {error ? <ApiErrorAlert message={error} /> : null}

        {!conversation ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
                <CardDescription>
                  {conversation.participants
                    .map((p) =>
                      [p.user.firstName, p.user.lastName].filter(Boolean).join(' ') ||
                      p.roleLabel ||
                      'Participant'
                    )
                    .join(', ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3" aria-label="Conversation messages">
                  {conversation.messages.map((message) => (
                    <li key={message.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">
                        {[message.sender.firstName, message.sender.lastName]
                          .filter(Boolean)
                          .join(' ') || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap">{message.body}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reply</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={(e) => void sendMessage(e)}>
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
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Sending…' : 'Send reply'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PermissionGate>
  );
}
