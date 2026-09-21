'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Template {
  id: string;
  name: string;
  slug: string;
  category: string;
  subject: string | null;
  body: string;
  channels: string[];
  isActive: boolean;
}

export default function AdminCommunicationsTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('Hello {{member_name}},\n\n{{church_name}}');

  async function load() {
    setLoading(true);
    const result = await apiGet<{ templates: Template[] }>('/admin/communications/templates');
    setLoading(false);
    if (!result.success || !result.data) {
      setError(result.message);
      return;
    }
    setError(null);
    setTemplates(result.data.templates);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await apiPost('/admin/communications/templates', {
      name,
      category,
      subject: subject.trim() || null,
      body,
      channels: ['in_app', 'email'],
    });
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setSuccess(result.message || 'Template created.');
    setName('');
    setSubject('');
    await load();
  }

  return (
    <PermissionGate permission="communications.view">
      <div className="space-y-6">
        <PageHeader
          title="Communication templates"
          description="Reusable message templates with allowlisted variables."
          actions={
            <Button asChild variant="outline">
              <Link href="/admin/communications">Back</Link>
            </Button>
          }
        />

        {error ? <ApiErrorAlert message={error} /> : null}
        {success ? <p className="text-sm text-muted-foreground">{success}</p> : null}

        <PermissionGate permission="communications.moderate">
          <Card>
            <CardHeader>
              <CardTitle>Create template</CardTitle>
              <CardDescription>
                Allowed variables: member_name, event_name, event_date, event_time, venue, church_name,
                ministry_name.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => void onCreate(e)}>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject (optional)</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Body</Label>
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Create template'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </PermissionGate>

        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates yet.</p>
            ) : (
              <ul className="space-y-3" aria-label="Communication templates">
                {templates.map((template) => (
                  <li key={template.id} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{template.name}</span>
                      <Badge variant="outline">{template.category}</Badge>
                      {!template.isActive ? <Badge variant="secondary">Inactive</Badge> : null}
                    </div>
                    <p className="mt-1 text-muted-foreground">{template.slug}</p>
                    <p className="mt-2 line-clamp-2">{template.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
