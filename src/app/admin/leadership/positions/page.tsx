'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
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
import { publicErrorMessage } from '@/lib/admin/http-error';

interface PositionRow {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  leaderCount: number;
}

export default function LeadershipPositionsPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<PositionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PositionRow | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pending, setPending] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    void apiGet<PositionRow[]>('/admin/leadership/positions').then((result) => {
      setRows(result.data || []);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditing(null);
    setTitle('');
    setDescription('');
    setOpen(true);
  }

  function startEdit(row: PositionRow) {
    setEditing(row);
    setTitle(row.title);
    setDescription(row.description || '');
    setOpen(true);
  }

  async function save() {
    setPending(true);
    const payload = { title, description: description || null };
    const result = editing
      ? await apiPatch(`/admin/leadership/positions/${editing.id}`, payload)
      : await apiPost('/admin/leadership/positions', payload);
    setPending(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(editing ? 'Position updated.' : 'Position created.');
    setOpen(false);
    load();
  }

  async function remove() {
    if (!deleteId) return;
    setPending(true);
    const result = await apiDelete(`/admin/leadership/positions/${deleteId}`);
    setPending(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Position deleted.');
    setDeleteId(null);
    load();
  }

  const columns: AdminColumn<PositionRow>[] = [
    { key: 'title', header: 'Title' },
    { key: 'leaderCount', header: 'Leaders', hideOnMobile: true },
    { key: 'isActive', header: 'Active', render: (row) => (row.isActive ? 'Yes' : 'No') },
  ];

  return (
    <PermissionGate permission="leadership.view">
      <div className="space-y-6">
        <PageHeader
          title="Leadership Positions"
          description="Define roles such as Senior Pastor or Ministry Coordinator."
          actions={
            can('leadership.create') ? <Button onClick={startCreate}>Add Position</Button> : null
          }
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No positions found."
          emptyDescription="Create a position before assigning leaders."
          rowActions={(row) => (
            <div className="flex justify-end gap-2">
              {can('leadership.update') ? (
                <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                  Edit
                </Button>
              ) : null}
              {can('leadership.delete') ? (
                <Button size="sm" variant="destructive" onClick={() => setDeleteId(row.id)}>
                  Delete
                </Button>
              ) : null}
            </div>
          )}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit position' : 'Add position'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="position-title">Title</Label>
                <Input id="position-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position-description">Description</Label>
                <Textarea
                  id="position-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void save()} disabled={pending || !title.trim()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <ConfirmDialog
          open={Boolean(deleteId)}
          onOpenChange={(openState) => !openState && setDeleteId(null)}
          title="Delete position?"
          description="Leaders assigned to this position will keep their profiles but lose the position assignment."
          confirmLabel="Delete"
          destructive
          loading={pending}
          onConfirm={remove}
        />
      </div>
    </PermissionGate>
  );
}
