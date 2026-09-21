'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPut } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { publicErrorMessage } from '@/lib/admin/http-error';

type MenuLocation = 'main' | 'footer' | 'mobile';

interface MenuItemRow {
  id?: string;
  label: string;
  href: string;
  sortOrder: number;
  isEnabled: boolean;
}

interface MenuResponse {
  id: string;
  location: MenuLocation;
  items: Array<{
    id: string;
    label: string;
    href: string;
    sortOrder: number;
    isEnabled: boolean;
  }>;
}

const LOCATIONS: MenuLocation[] = ['main', 'footer', 'mobile'];

export default function CmsMenusPage() {
  const { can } = useAuth();
  const [location, setLocation] = useState<MenuLocation>('main');
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback((loc: MenuLocation) => {
    void apiGet<MenuResponse>(`/admin/cms/menus/${loc}`).then((result) => {
      if (!result.success || !result.data) return;
      setItems(
        result.data.items.map((item) => ({
          id: item.id,
          label: item.label,
          href: item.href,
          sortOrder: item.sortOrder,
          isEnabled: item.isEnabled,
        }))
      );
    });
  }, []);

  useEffect(() => {
    load(location);
  }, [location, load]);

  function updateItem(index: number, patch: Partial<MenuItemRow>) {
    setItems((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { label: 'New link', href: '/', sortOrder: current.length, isEnabled: true },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    const result = await apiPut<MenuResponse>(`/admin/cms/menus/${location}`, {
      items: items.map((item, index) => ({
        ...item,
        sortOrder: index,
      })),
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Menu saved.');
    if (result.data) {
      setItems(
        result.data.items.map((item) => ({
          id: item.id,
          label: item.label,
          href: item.href,
          sortOrder: item.sortOrder,
          isEnabled: item.isEnabled,
        }))
      );
    }
  }

  return (
    <PermissionGate permission="content.view">
      <div className="space-y-6">
        <PageHeader
          title="Navigation menus"
          description="Edit main, footer, and mobile navigation links."
          actions={
            can('content.update') ? (
              <Button disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save menu'}
              </Button>
            ) : null
          }
        />

        <Tabs
          value={location}
          onValueChange={(value) => setLocation(value as MenuLocation)}
        >
          <TabsList>
            {LOCATIONS.map((loc) => (
              <TabsTrigger key={loc} value={loc} className="capitalize">
                {loc}
              </TabsTrigger>
            ))}
          </TabsList>

          {LOCATIONS.map((loc) => (
            <TabsContent key={loc} value={loc} className="space-y-4">
              <ul className="space-y-3">
                {items.map((item, index) => (
                  <li key={item.id ?? `new-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_auto_auto]">
                    <div className="space-y-1">
                      <Label htmlFor={`label-${index}`}>Label</Label>
                      <Input
                        id={`label-${index}`}
                        value={item.label}
                        disabled={!can('content.update')}
                        onChange={(event) => updateItem(index, { label: event.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`href-${index}`}>Href</Label>
                      <Input
                        id={`href-${index}`}
                        value={item.href}
                        disabled={!can('content.update')}
                        onChange={(event) => updateItem(index, { href: event.target.value })}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`enabled-${index}`}
                          checked={item.isEnabled}
                          disabled={!can('content.update')}
                          onCheckedChange={(checked) => updateItem(index, { isEnabled: checked })}
                          aria-label={`Enable ${item.label}`}
                        />
                        <Label htmlFor={`enabled-${index}`}>Enabled</Label>
                      </div>
                    </div>
                    {can('content.update') ? (
                      <div className="flex items-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => removeItem(index)}>
                          Remove
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
              {can('content.update') ? (
                <Button type="button" variant="outline" onClick={addItem}>
                  Add item
                </Button>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </PermissionGate>
  );
}
