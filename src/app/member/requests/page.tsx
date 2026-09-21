'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api/client';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface RequestRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  categoryName: string | null;
  createdAt: string;
}

export default function Page() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useMemo(
    () => () => {
      void apiGet<RequestRow[]>('/member/requests').then((result) => {
        if (!result.success) {
          setError(result.message);
          return;
        }
        setRows(result.data || []);
        setError(null);
      });
    },
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const result = await apiPost<RequestRow>('/member/requests', {
      categoryId,
      title,
      description,
    });
    setSubmitting(false);
    if (!result.success) {
      setMessage(result.message || 'Could not submit request.');
      return;
    }
    setTitle('');
    setDescription('');
    setMessage('Request submitted.');
    load();
  }

  if (error) return <ApiErrorAlert message={error} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Administrative requests</h1>
        <p className="text-muted-foreground">
          Submit and track requests to church administration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New request</CardTitle>
          <CardDescription>Use your category ID from the church office list.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <Input
              placeholder="Category ID"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            />
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your requests</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {rows.map((row) => (
                <li key={row.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{row.title}</p>
                    <Badge variant="secondary">{row.status}</Badge>
                    <Badge variant="outline">{row.priority}</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {row.categoryName || 'Request'} ·{' '}
                    {new Date(row.createdAt).toLocaleDateString()}
                  </p>
                  <p>{row.description}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
