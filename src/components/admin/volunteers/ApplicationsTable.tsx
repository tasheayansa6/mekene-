'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPatch } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface ApplicationRow {
  id: string;
  status: string;
  statusLabel: string;
  preferredMinistry: string | null;
  skills: string | null;
  experience: string | null;
  availability: string | null;
  motivation: string | null;
  preferredTimes: string | null;
  reviewerMessage: string | null;
  reviewNotes: string | null;
  submittedAt: string | null;
  updatedAt: string;
  member: { id: string; name: string; membershipNumber: string | null } | null;
  ministry: { id: string; name: string } | null;
  reviewedBy: { id: string; name: string | null } | null;
}

const APPLICATION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'more_info',
  'approved',
  'rejected',
  'withdrawn',
] as const;

export function ApplicationsTable() {
  const { can } = useAuth();
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('submitted');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewRow, setReviewRow] = useState<ApplicationRow | null>(null);
  const [reviewerMessage, setReviewerMessage] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const params = useMemo(() => {
    const next: Record<string, string> = {
      page: String(page),
      pageSize: '20',
    };
    if (q.trim()) next.q = q.trim();
    if (status !== 'all') next.status = status;
    return next;
  }, [page, q, status]);

  function load() {
    setLoading(true);
    void apiGet<ApplicationRow[]>('/admin/volunteers/applications', params).then((result) => {
      setRows(result.data || []);
      setTotal(result.pagination?.totalItems || 0);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }

  useEffect(() => {
    const handle = setTimeout(load, 150);
    return () => clearTimeout(handle);
  }, [params]);

  async function runAction(action: 'approve' | 'reject' | 'request_info') {
    if (!reviewRow) return;
    setSaving(true);
    const result = await apiPatch(`/admin/volunteers/applications/${reviewRow.id}`, {
      action,
      reviewerMessage: reviewerMessage.trim() || null,
      reviewNotes: reviewNotes.trim() || null,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Updated');
    setReviewRow(null);
    setReviewerMessage('');
    setReviewNotes('');
    load();
  }

  const columns: AdminColumn<ApplicationRow>[] = [
    {
      key: 'member',
      header: 'Applicant',
      render: (row) => row.member?.name || '—',
    },
    {
      key: 'ministry',
      header: 'Ministry',
      hideOnMobile: true,
      render: (row) => row.ministry?.name || row.preferredMinistry || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant="secondary">{row.statusLabel}</Badge>,
    },
    {
      key: 'submittedAt',
      header: 'Submitted',
      render: (row) =>
        row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '—',
    },
    {
      key: 'reviewedBy',
      header: 'Reviewed by',
      hideOnMobile: true,
      render: (row) => row.reviewedBy?.name || '—',
    },
  ];

  return (
    <PermissionGate permission="volunteers.view">
      <div className="space-y-6">
        <PageHeader
          title="Volunteer applications"
          description="Review applications. Private review notes are never shown to members."
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={loading}
          error={error}
          emptyTitle="No volunteer applications."
          search={q}
          onSearchChange={(value) => {
            setQ(value);
            setPage(1);
          }}
          searchPlaceholder="Search applications…"
          page={page}
          pageSize={20}
          totalItems={total}
          onPageChange={setPage}
          filters={
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {APPLICATION_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          rowActions={(row) =>
            can('volunteers.approve') || can('volunteers.update') ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setReviewRow(row);
                  setReviewerMessage(row.reviewerMessage || '');
                  setReviewNotes(row.reviewNotes || '');
                }}
              >
                Review
              </Button>
            ) : null
          }
        />

        <Dialog
          open={Boolean(reviewRow)}
          onOpenChange={(open) => {
            if (!open) setReviewRow(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Review application</DialogTitle>
              <DialogDescription>
                {reviewRow?.member?.name || 'Applicant'} ·{' '}
                {reviewRow?.ministry?.name || reviewRow?.preferredMinistry || 'General'}
              </DialogDescription>
            </DialogHeader>
            {reviewRow ? (
              <div className="space-y-4 text-sm">
                <div className="space-y-1 rounded-md border p-3">
                  <p>
                    <span className="text-muted-foreground">Skills: </span>
                    {reviewRow.skills || '—'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Experience: </span>
                    {reviewRow.experience || '—'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Availability: </span>
                    {reviewRow.availability || '—'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Motivation: </span>
                    {reviewRow.motivation || '—'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Preferred times: </span>
                    {reviewRow.preferredTimes || '—'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewer-message">Message to applicant</Label>
                  <Textarea
                    id="reviewer-message"
                    value={reviewerMessage}
                    onChange={(event) => setReviewerMessage(event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-notes">Private review notes</Label>
                  <Textarea
                    id="review-notes"
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    rows={3}
                    placeholder="Internal only — never shown to the member"
                  />
                </div>
              </div>
            ) : null}
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => void runAction('request_info')}
              >
                Request info
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={() => void runAction('reject')}
              >
                Reject
              </Button>
              <Button type="button" disabled={saving} onClick={() => void runAction('approve')}>
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
