'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api/client';

interface HistoryRow {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  changedBy: { name: string; email: string } | null;
}

export function EventHistoryPanel({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<HistoryRow[]>([]);

  useEffect(() => {
    void apiGet<HistoryRow[]>(`/admin/events/${eventId}/history`).then((result) => {
      setRows(result.data || []);
    });
  }, [eventId]);

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-3">When</th>
            <th className="p-3">Field</th>
            <th className="p-3">Change</th>
            <th className="p-3">By</th>
          </tr>
        </thead>
        <tbody>
          {!rows.length ? (
            <tr>
              <td colSpan={4} className="p-4 text-muted-foreground">
                No tracked changes yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b align-top">
                <td className="p-3 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="p-3 font-medium">{row.field}</td>
                <td className="p-3">
                  <span className="text-muted-foreground">{row.oldValue || '—'}</span>
                  {' → '}
                  <span>{row.newValue || '—'}</span>
                </td>
                <td className="p-3">{row.changedBy?.name || row.changedBy?.email || 'System'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
