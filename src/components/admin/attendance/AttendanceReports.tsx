'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface ReportData {
  metrics: {
    totalSessions: number;
    totalPresent: number;
    totalLate: number;
    totalExcused: number;
    checkedIn: number;
    averageAttendance: number;
    definitions: Record<string, string>;
  };
  series: Array<{
    key: string;
    label: string;
    present: number;
    late: number;
    sessions: number;
  }>;
}

export function AttendanceReports() {
  const [groupBy, setGroupBy] = useState('day');
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<ReportData>('/admin/attendance/reports', { groupBy }).then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        toast.error(result.message || 'Unable to load reports.');
        return;
      }
      setData(result.data);
      setError(null);
    });
  }, [groupBy]);

  return (
    <PermissionGate permission="attendance.view">
      <div className="space-y-6">
        <PageHeader
          title="Attendance reports"
          description="Aggregated counts only. Charts do not list individual members."
          actions={
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-44" aria-label="Group reports by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">By day</SelectItem>
                <SelectItem value="week">By week</SelectItem>
                <SelectItem value="month">By month</SelectItem>
                <SelectItem value="sessionType">By session type</SelectItem>
                <SelectItem value="ministry">By ministry</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {error ? <ApiErrorAlert message={error} /> : null}
        {!data ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardDescription>Sessions</CardDescription>
                  <CardTitle>{data.metrics.totalSessions}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Present</CardDescription>
                  <CardTitle>{data.metrics.totalPresent}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Late</CardDescription>
                  <CardTitle>{data.metrics.totalLate}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Avg present+late / session</CardDescription>
                  <CardTitle>{data.metrics.averageAttendance}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Attendance over time</CardTitle>
                <CardDescription>{data.metrics.definitions.averageAttendance}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {data.series.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No attendance data is available for this period.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.series}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" hide={data.series.length > 14} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="present" name="Present" fill="hsl(var(--primary))" />
                      <Bar dataKey="late" name="Late" fill="hsl(var(--muted-foreground))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PermissionGate>
  );
}
