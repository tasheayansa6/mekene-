'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api/client';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
  };
}

export default function MemberMessageThreadPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ConversationDetail | null>(null);
  const [body, setBody] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportMessageId, setReportMessageId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!params.id) return;
    const result = await apiGet<ConversationDetail>(`/member/messages/${params.id}`);
    if (!result.success || !result.data) {
      setError(result.message);
      return;
    }
    setData(result.data);
    await apiPost(`/member/messages/${params.id}/read`, {});
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!params.id) return;
    setSaving(true);
    setError(null);
    const result = await apiPost(`/member/messages/${params.id}`, { body });
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setBody('');
    await load();
  }

  async function reportMessage(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const result = await apiPost('/member/messages/report', {
      messageId: reportMessageId,
      reason: reportReason,
    });
    if (!result.success) {
      setError(result.message);
      return;
    }
    setMessage('Report submitted.');
    setReportReason('');
    setReportMessageId('');
  }

  const conversation = data?.conversation;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{conversation?.subject || 'Conversation'}</h1>
          <p className="text-sm text-muted-foreground">Private support thread with church staff.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/member/messages">Back</Link>
        </Button>
      </div>

      {error ? <ApiErrorAlert message={error} /> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      {!conversation ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-3" aria-label="Conversation messages">
                {conversation.messages.map((msg) => (
                  <li key={msg.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">
                      {[msg.sender.firstName, msg.sender.lastName].filter(Boolean).join(' ') ||
                        'User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap">{msg.body}</p>
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

          <Card>
            <CardHeader>
              <CardTitle>Report a message</CardTitle>
              <CardDescription>Flag inappropriate content for staff review.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => void reportMessage(e)}>
                <div className="space-y-2">
                  <Label htmlFor="reportMessageId">Message ID</Label>
                  <Input
                    id="reportMessageId"
                    value={reportMessageId}
                    onChange={(e) => setReportMessageId(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportReason">Reason</Label>
                  <Textarea
                    id="reportReason"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    rows={3}
                    required
                  />
                </div>
                <Button type="submit" variant="secondary">
                  Submit report
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
