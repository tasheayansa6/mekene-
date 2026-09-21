'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPut } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface AvailabilityRow {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function defaultRows(): AvailabilityRow[] {
  return DAY_LABELS.map((_, dayOfWeek) => ({
    dayOfWeek,
    startTime: '09:00',
    endTime: '12:00',
    isAvailable: false,
  }));
}

export default function MemberAvailabilityPage() {
  const [rows, setRows] = useState<AvailabilityRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void apiGet<{ slots: AvailabilityRow[] }>('/members/me/volunteering/availability').then(
      (result) => {
        const incoming = result.data?.slots || [];
        if (incoming.length === 0) {
          setRows(defaultRows());
          return;
        }
        const byDay = new Map(incoming.map((row) => [row.dayOfWeek, row]));
        setRows(
          DAY_LABELS.map((_, dayOfWeek) => {
            const existing = byDay.get(dayOfWeek);
            return (
              existing || {
                dayOfWeek,
                startTime: '09:00',
                endTime: '12:00',
                isAvailable: false,
              }
            );
          })
        );
      }
    );
  }, []);

  function updateRow(dayOfWeek: number, patch: Partial<AvailabilityRow>) {
    setRows((prev) =>
      (prev || []).map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row))
    );
  }

  async function save() {
    if (!rows) return;
    setSaving(true);
    const result = await apiPut('/members/me/volunteering/availability', {
      slots: rows
        .filter((row) => row.isAvailable)
        .map((row) => ({
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
          isAvailable: true,
        })),
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Saved');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Availability</h1>
          <p className="text-sm text-muted-foreground">
            Tell ministry coordinators when you can usually serve.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/member/volunteering">Back</Link>
        </Button>
      </div>

      {!rows ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Weekly availability</CardTitle>
            <CardDescription>Check days you can serve and set a usual time window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.map((row) => (
              <div
                key={row.dayOfWeek}
                className="grid gap-3 rounded-md border p-3 sm:grid-cols-[140px_1fr_1fr] sm:items-end"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`day-${row.dayOfWeek}`}
                    checked={row.isAvailable}
                    onCheckedChange={(checked) =>
                      updateRow(row.dayOfWeek, { isAvailable: Boolean(checked) })
                    }
                  />
                  <Label htmlFor={`day-${row.dayOfWeek}`}>{DAY_LABELS[row.dayOfWeek]}</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`start-${row.dayOfWeek}`}>Start</Label>
                  <Input
                    id={`start-${row.dayOfWeek}`}
                    type="time"
                    value={row.startTime}
                    disabled={!row.isAvailable}
                    onChange={(event) =>
                      updateRow(row.dayOfWeek, { startTime: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`end-${row.dayOfWeek}`}>End</Label>
                  <Input
                    id={`end-${row.dayOfWeek}`}
                    type="time"
                    value={row.endTime}
                    disabled={!row.isAvailable}
                    onChange={(event) => updateRow(row.dayOfWeek, { endTime: event.target.value })}
                  />
                </div>
              </div>
            ))}
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save availability'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
