'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { publicErrorMessage } from '@/lib/admin/http-error';

export default function MemberMergePage() {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [preview, setPreview] = useState<unknown>(null);

  async function run(confirm: boolean) {
    const result = await apiPost('/admin/members/merge', {
      sourceId: sourceId.trim(),
      targetId: targetId.trim(),
      confirm,
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    setPreview(result.data);
    toast.success(confirm ? 'Merge completed.' : 'Preview ready — confirm to proceed.');
  }

  return (
    <PermissionGate permission="members.manage">
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          title="Merge members"
          description="Preview conflicts first. Source is archived; financial and history records are preserved on the target."
        />
        <div className="grid gap-3 rounded-md border p-4">
          <div className="space-y-1">
            <Label htmlFor="source">Source member id (will be archived)</Label>
            <Input id="source" value={sourceId} onChange={(e) => setSourceId(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="target">Target member id (canonical)</Label>
            <Input id="target" value={targetId} onChange={(e) => setTargetId(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void run(false)}>
              Preview
            </Button>
            <Button type="button" onClick={() => void run(true)}>
              Confirm merge
            </Button>
          </div>
        </div>
        {preview ? (
          <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs">
            {JSON.stringify(preview, null, 2)}
          </pre>
        ) : null}
      </div>
    </PermissionGate>
  );
}
