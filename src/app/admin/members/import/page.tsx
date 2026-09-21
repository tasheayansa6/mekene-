'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { publicErrorMessage } from '@/lib/admin/http-error';

export default function MemberImportPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [preview, setPreview] = useState<
    Array<{ row: number; email?: string; valid: boolean; errors: string[]; duplicateWarnings: string[] }>
  >([]);
  const [summary, setSummary] = useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
  } | null>(null);

  async function upload(file: File) {
    const body = new FormData();
    body.set('file', file);
    const csrf = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)?.[1];
    const res = await fetch('/api/v1/admin/members/import', {
      method: 'POST',
      credentials: 'include',
      headers: csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : undefined,
      body,
    });
    const json = await res.json();
    if (!json.success) {
      toast.error(publicErrorMessage(res.status, json.message));
      return;
    }
    setJobId(json.data.job.id);
    setSummary(json.data.job);
    setPreview(json.data.preview || []);
    toast.success('File validated. Review before confirming.');
  }

  async function confirm() {
    if (!jobId) return;
    const result = await apiPost(`/admin/members/import/${jobId}/confirm`);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Import completed.');
  }

  return (
    <PermissionGate permission="members.import">
      <div className="space-y-6">
        <PageHeader
          title="Import members"
          description="Upload CSV, validate, review duplicates, then confirm. Nothing is imported until you confirm."
        />
        <div className="space-y-2 rounded-md border p-4">
          <Label htmlFor="import-file">CSV file</Label>
          <Input
            id="import-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <p className="text-sm text-muted-foreground">
            Columns: email, firstName, lastName, phone, membershipType, status
          </p>
        </div>
        {summary ? (
          <div className="grid gap-2 text-sm sm:grid-cols-4">
            <p>Total: {summary.totalRows}</p>
            <p>Valid: {summary.validRows}</p>
            <p>Invalid: {summary.invalidRows}</p>
            <p>Possible duplicates: {summary.duplicateRows}</p>
          </div>
        ) : null}
        {preview.length ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Row</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.row} className="border-b">
                    <td className="p-2">{row.row}</td>
                    <td className="p-2">{row.email}</td>
                    <td className="p-2">{row.valid ? 'Valid' : 'Invalid'}</td>
                    <td className="p-2">
                      {[...row.errors, ...row.duplicateWarnings.map((d) => `Duplicate: ${d}`)].join(
                        '; '
                      ) || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {jobId ? (
          <Button onClick={() => void confirm()}>Confirm import (skip duplicate rows)</Button>
        ) : null}
      </div>
    </PermissionGate>
  );
}
