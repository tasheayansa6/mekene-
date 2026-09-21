'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface TestimonialRow {
  id: string;
  name: string;
  content: string;
  photoUrl: string | null;
  permissionGranted: boolean;
  status: string;
}

const emptyForm = {
  name: '',
  content: '',
  photoUrl: '',
  permissionGranted: false,
  status: 'draft' as 'draft' | 'review' | 'published',
};

export default function CmsTestimonialsPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<TestimonialRow[]>([]);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(() => {
    void apiGet<TestimonialRow[]>('/admin/cms/testimonials', { pageSize: '100' }).then((result) => {
      if (result.success) setRows(result.data || []);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createTestimonial() {
    if (form.status === 'published' && !form.permissionGranted) {
      toast.error('Permission must be granted before publishing a testimonial.');
      return;
    }
    const result = await apiPost('/admin/cms/testimonials', {
      ...form,
      photoUrl: form.photoUrl || null,
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Testimonial created.');
    setForm(emptyForm);
    load();
  }

  async function togglePermission(row: TestimonialRow) {
    const result = await apiPatch(`/admin/cms/testimonials/${row.id}`, {
      permissionGranted: !row.permissionGranted,
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    load();
  }

  async function publish(row: TestimonialRow) {
    if (!row.permissionGranted) {
      toast.error('Permission must be granted before publishing.');
      return;
    }
    const result = await apiPatch(`/admin/cms/testimonials/${row.id}`, { status: 'published' });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Testimonial published.');
    load();
  }

  return (
    <PermissionGate permission="content.view">
      <div className="space-y-6">
        <PageHeader
          title="Testimonials"
          description="Member stories for the public site. Publishing requires recorded permission."
        />

        {can('content.create') ? (
          <form
            className="grid gap-3 rounded-lg border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void createTestimonial();
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="testimonial-name">Name</Label>
                <Input
                  id="testimonial-name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="testimonial-photo">Photo URL (optional)</Label>
                <Input
                  id="testimonial-photo"
                  value={form.photoUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, photoUrl: event.target.value }))}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="testimonial-content">Content</Label>
                <Textarea
                  id="testimonial-content"
                  rows={4}
                  value={form.content}
                  onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                  required
                />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Checkbox
                  id="testimonial-permission"
                  checked={form.permissionGranted}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, permissionGranted: checked === true }))
                  }
                />
                <Label htmlFor="testimonial-permission">Permission granted to publish</Label>
              </div>
            </div>
            <Button type="submit" className="w-fit">
              Add testimonial
            </Button>
          </form>
        ) : null}

        <ul className="divide-y rounded-lg border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{row.name}</p>
                  <Badge variant="outline">{row.status}</Badge>
                  <Badge variant={row.permissionGranted ? 'default' : 'secondary'}>
                    {row.permissionGranted ? 'Permission granted' : 'No permission'}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{row.content}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {can('content.update') ? (
                  <Button variant="outline" size="sm" onClick={() => void togglePermission(row)}>
                    {row.permissionGranted ? 'Revoke permission' : 'Grant permission'}
                  </Button>
                ) : null}
                {can('content.update') && row.status !== 'published' ? (
                  <Button size="sm" disabled={!row.permissionGranted} onClick={() => void publish(row)}>
                    Publish
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PermissionGate>
  );
}
