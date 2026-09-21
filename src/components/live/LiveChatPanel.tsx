'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { apiGet, apiPost, ensureCsrfToken } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChatMessage {
  id: string;
  displayName: string;
  body: string;
  createdAt: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function LiveChatPanel({
  slug,
  enabled,
  isLive,
}: {
  slug: string;
  enabled: boolean;
  isLive: boolean;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!enabled || !isLive) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function poll() {
      const result = await apiGet<ChatMessage[]>(`/live/${slug}/chat`);
      if (!cancelled && result.success && result.data) {
        setMessages(result.data);
        setLoading(false);
      }
    }

    void poll();
    const id = window.setInterval(poll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [slug, enabled, isLive]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    if (!user) {
      toast.error('Sign in to participate in live chat.');
      return;
    }
    setPosting(true);
    await ensureCsrfToken();
    const result = await apiPost(`/live/${slug}/chat`, { body: trimmed });
    setPosting(false);
    if (!result.success) {
      toast.error(result.message || 'Could not send message.');
      return;
    }
    setBody('');
    const refresh = await apiGet<ChatMessage[]>(`/live/${slug}/chat`);
    if (refresh.success && refresh.data) setMessages(refresh.data);
  }

  if (!enabled) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Live chat</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground" role="status">
            Loading messages…
          </p>
        ) : !isLive ? (
          <p className="text-sm text-muted-foreground">Chat opens when the stream is live.</p>
        ) : (
          <>
            <ul
              ref={listRef}
              aria-label="Live chat messages"
              className="max-h-72 space-y-2 overflow-y-auto rounded-md border bg-muted/20 p-3"
            >
              {messages.length === 0 ? (
                <li className="text-sm text-muted-foreground">No messages yet. Say hello!</li>
              ) : (
                messages.map((message) => (
                  <li key={message.id} className="text-sm">
                    <span className="font-medium">{message.displayName}</span>
                    <span className="mx-1 text-muted-foreground" aria-hidden>
                      ·
                    </span>
                    <time className="text-xs text-muted-foreground" dateTime={message.createdAt}>
                      {formatTime(message.createdAt)}
                    </time>
                    <p className="mt-0.5">{message.body}</p>
                  </li>
                ))
              )}
            </ul>
            {user ? (
              <form onSubmit={submit} className="flex gap-2">
                <Input
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Send a message…"
                  maxLength={400}
                  disabled={posting}
                  aria-label="Chat message"
                />
                <Button type="submit" size="icon" disabled={posting || !body.trim()} aria-label="Send">
                  {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link href="/login" className="underline">
                  Sign in
                </Link>{' '}
                to join the conversation.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
