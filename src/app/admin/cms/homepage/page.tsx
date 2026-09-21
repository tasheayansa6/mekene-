'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPut } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface HomepageSection {
  id: string;
  key: string;
  type: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  isEnabled: boolean;
  sortOrder: number;
}

export default function CmsHomepagePage() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    void apiGet<HomepageSection[]>('/admin/cms/homepage').then((result) => {
      if (result.success && result.data) setSections(result.data);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function persist(next: HomepageSection[], orderedIds?: string[]) {
    setSaving(true);
    const result = await apiPut<HomepageSection[]>('/admin/cms/homepage', {
      ...(orderedIds ? { orderedIds } : {}),
      sections: next.map((section) => ({
        id: section.id,
        data: {
          title: section.title,
          subtitle: section.subtitle,
          body: section.body,
          isEnabled: section.isEnabled,
        },
      })),
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    setSections(result.data || next);
    toast.success('Homepage sections updated.');
  }

  function updateSection(id: string, patch: Partial<HomepageSection>) {
    setSections((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    void persist(next, next.map((row) => row.id));
  }

  return (
    <PermissionGate permission="content.view">
      <div className="space-y-6">
        <PageHeader
          title="Homepage sections"
          description="Enable, edit, and reorder homepage blocks. Disabled sections are hidden on the public homepage."
          actions={
            <Button disabled={saving} onClick={() => void persist(sections)}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          }
        />

        <ul className="space-y-4">
          {sections.map((section, index) => (
            <li key={section.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{section.key}</p>
                  <p className="text-sm text-muted-foreground">{section.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`enabled-${section.id}`}
                      checked={section.isEnabled}
                      onCheckedChange={(checked) => updateSection(section.id, { isEnabled: checked })}
                      aria-label={`Toggle ${section.key} section`}
                    />
                    <Label htmlFor={`enabled-${section.id}`}>Enabled</Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => moveSection(index, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={index === sections.length - 1}
                    onClick={() => moveSection(index, 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`title-${section.id}`}>Title</Label>
                  <Input
                    id={`title-${section.id}`}
                    value={section.title ?? ''}
                    onChange={(event) => updateSection(section.id, { title: event.target.value || null })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`subtitle-${section.id}`}>Subtitle</Label>
                  <Input
                    id={`subtitle-${section.id}`}
                    value={section.subtitle ?? ''}
                    onChange={(event) => updateSection(section.id, { subtitle: event.target.value || null })}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor={`body-${section.id}`}>Body</Label>
                  <Textarea
                    id={`body-${section.id}`}
                    rows={3}
                    value={section.body ?? ''}
                    onChange={(event) => updateSection(section.id, { body: event.target.value || null })}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PermissionGate>
  );
}
