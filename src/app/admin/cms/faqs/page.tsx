'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface FaqRow {
  id: string;
  question: string;
  answer: string;
  category: string;
  status: string;
  sortOrder: number;
}

const emptyForm = { question: '', answer: '', category: 'general', status: 'draft' as 'draft' | 'review' | 'published' };

export default function CmsFaqsPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<FaqRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<FaqRow | null>(null);

  const load = useCallback(() => {
    void apiGet<FaqRow[]>('/admin/cms/faqs', { pageSize: '100' }).then((result) => {
      if (result.success) setRows(result.data || []);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createFaq() {
    const result = await apiPost('/admin/cms/faqs', form);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('FAQ created.');
    setForm(emptyForm);
    load();
  }

  async function saveEdit() {
    if (!editing) return;
    const result = await apiPatch(`/admin/cms/faqs/${editing.id}`, {
      question: editing.question,
      answer: editing.answer,
      category: editing.category,
      status: editing.status,
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('FAQ updated.');
    setEditing(null);
    load();
  }

  async function archiveFaq(id: string) {
    const result = await apiDelete(`/admin/cms/faqs/${id}`);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('FAQ archived.');
    load();
  }

  return (
    <PermissionGate permission="content.view">
      <div className="space-y-6">
        <PageHeader
          title="FAQs"
          description="Manage frequently asked questions shown on the public FAQ page."
        />

        {can('content.create') ? (
          <form
            className="grid gap-3 rounded-lg border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void createFaq();
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="faq-question">Question</Label>
                <Input
                  id="faq-question"
                  value={form.question}
                  onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="faq-answer">Answer</Label>
                <Textarea
                  id="faq-answer"
                  rows={4}
                  value={form.answer}
                  onChange={(event) => setForm((prev) => ({ ...prev, answer: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="faq-category">Category</Label>
                <Input
                  id="faq-category"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="faq-status">Status</Label>
                <select
                  id="faq-status"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, status: event.target.value as typeof form.status }))
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <Button type="submit" className="w-fit">
              Add FAQ
            </Button>
          </form>
        ) : null}

        <ul className="divide-y rounded-lg border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{row.question}</p>
                  <Badge variant="outline">{row.status}</Badge>
                  <Badge variant="secondary">{row.category}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{row.answer}</p>
              </div>
              <div className="flex gap-2">
                {can('content.update') ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(row)}>
                    Edit
                  </Button>
                ) : null}
                {can('content.archive') ? (
                  <Button variant="outline" size="sm" onClick={() => void archiveFaq(row.id)}>
                    Archive
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit FAQ</DialogTitle>
            </DialogHeader>
            {editing ? (
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-question">Question</Label>
                  <Input
                    id="edit-question"
                    value={editing.question}
                    onChange={(event) => setEditing({ ...editing, question: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-answer">Answer</Label>
                  <Textarea
                    id="edit-answer"
                    rows={4}
                    value={editing.answer}
                    onChange={(event) => setEditing({ ...editing, answer: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-status">Status</Label>
                  <select
                    id="edit-status"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={editing.status}
                    onChange={(event) => setEditing({ ...editing, status: event.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="review">Review</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={() => void saveEdit()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
