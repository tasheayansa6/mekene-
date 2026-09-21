'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface ProgramItem {
  id: string;
  title: string;
  itemType: string;
  durationMinutes: number | null;
  responsibleLabel: string | null;
  sortOrder: number;
}

interface ProgramData {
  id: string;
  title: string | null;
  notes: string | null;
  isPublic: boolean;
  items: ProgramItem[];
}

const ITEM_TYPES = ['worship', 'prayer', 'sermon', 'scripture', 'offering', 'announcement', 'other'];

export function EventProgramEditor({ eventId }: { eventId: string }) {
  const [program, setProgram] = useState<ProgramData | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('worship');
  const [saving, setSaving] = useState(false);

  function load() {
    void apiGet<ProgramData>(`/admin/events/${eventId}/program`).then((result) => {
      if (!result.data) return;
      setProgram(result.data);
      setTitle(result.data.title || '');
      setNotes(result.data.notes || '');
      setIsPublic(result.data.isPublic);
    });
  }

  useEffect(() => {
    load();
  }, [eventId]);

  async function saveMeta() {
    setSaving(true);
    const result = await apiPatch(`/admin/events/${eventId}/program`, {
      title: title || null,
      notes: notes || null,
      isPublic,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Program settings saved.');
    load();
  }

  async function addItem() {
    if (!newTitle.trim()) return;
    const result = await apiPost(`/admin/events/${eventId}/program/items`, {
      title: newTitle.trim(),
      itemType: newType,
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    setNewTitle('');
    toast.success('Item added.');
    load();
  }

  async function removeItem(itemId: string) {
    const result = await apiDelete(`/admin/events/${eventId}/program/items/${itemId}`);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    load();
  }

  async function moveItem(index: number, direction: -1 | 1) {
    if (!program) return;
    const items = [...program.items];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    const result = await apiPost(`/admin/events/${eventId}/program/reorder`, {
      orderedIds: items.map((item) => item.id),
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="program-title">Program title</Label>
          <Input id="program-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch id="program-public" checked={isPublic} onCheckedChange={setIsPublic} />
          <Label htmlFor="program-public">Show on public event page when published</Label>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="program-notes">Notes</Label>
          <Textarea id="program-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
        <Button onClick={() => void saveMeta()} disabled={saving}>
          Save program settings
        </Button>
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <h3 className="font-medium">Order of service</h3>
        {!program?.items.length ? (
          <p className="text-sm text-muted-foreground">No program items yet.</p>
        ) : (
          <ol className="space-y-2">
            {program.items.map((item, index) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2 rounded border p-2 text-sm">
                <span className="font-medium">{index + 1}. {item.title}</span>
                <span className="text-muted-foreground">({item.itemType})</span>
                {item.responsibleLabel ? (
                  <span className="text-muted-foreground">— {item.responsibleLabel}</span>
                ) : null}
                <div className="ml-auto flex gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => void moveItem(index, -1)}>
                    Up
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => void moveItem(index, 1)}>
                    Down
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => void removeItem(item.id)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Input
            placeholder="Item title (e.g. Opening worship)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            aria-label="Item type"
          >
            {ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Button type="button" onClick={() => void addItem()}>
            Add item
          </Button>
        </div>
      </div>
    </div>
  );
}
