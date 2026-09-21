'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UsersRound,
  UserRoundCog,
  Calendar,
  BookOpen,
  Heart,
  Bell,
  ClipboardCheck,
} from 'lucide-react';
import { apiGet } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/admin/StatCard';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { ADMIN_QUICK_ACTIONS, filterQuickActions } from '@/config/admin-nav';
import type { DashboardStats } from '@/lib/admin/dashboard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityItem {
  id: string;
  summary: string;
  createdAt: string;
  user: { name: string } | null;
}

export default function AdminDashboardPage() {
  const { user, can } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const actions = useMemo(() => filterQuickActions(ADMIN_QUICK_ACTIONS, can), [can]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([
        apiGet<DashboardStats>('/admin/dashboard'),
        apiGet<ActivityItem[]>('/admin/activity', { pageSize: '8' }),
      ]).then(([dash, act]) => {
        if (!dash.success) setError(dash.message || 'Unable to load dashboard.');
        else setStats(dash.data);
        setActivity(act.data || []);
        setLoading(false);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Welcome${user ? `, ${user.firstName}` : ''}. Review live church administration data.`}
      />

      {error ? <ApiErrorAlert message={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can('users.view') ? (
          <StatCard
            label="Total Users"
            value={stats?.users.total}
            href="/admin/users"
            icon={Users}
            loading={loading}
          />
        ) : null}
        {can('users.view') ? (
          <StatCard
            label="Active Users"
            value={stats?.users.active}
            href="/admin/users"
            icon={Users}
            loading={loading}
          />
        ) : null}
        {can('ministries.view') ? (
          <StatCard
            label="Active Ministries"
            value={stats?.ministries.active}
            href="/admin/ministries"
            icon={UsersRound}
            loading={loading}
          />
        ) : null}
        {can('leadership.view') ? (
          <StatCard
            label="Active Leaders"
            value={stats?.leadership.active}
            href="/admin/leadership"
            icon={UserRoundCog}
            loading={loading}
          />
        ) : null}
        <StatCard label="Upcoming Events" icon={Calendar} comingSoon />
        <StatCard label="Published Sermons" icon={BookOpen} comingSoon />
        {can('attendance.view') ? (
          <StatCard
            label="Open Attendance Sessions"
            value={stats?.attendance?.openSessions}
            href="/admin/attendance"
            icon={ClipboardCheck}
            loading={loading}
          />
        ) : (
          <StatCard label="Unread Notifications" icon={Bell} comingSoon />
        )}
      </div>

      {can('prayer.view') ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Prayer ministry</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="New Requests"
              value={stats?.prayer?.new}
              href="/admin/prayer?status=new"
              icon={Heart}
              loading={loading}
            />
            <StatCard
              label="Under Review"
              value={stats?.prayer?.underReview}
              href="/admin/prayer?status=under_review"
              icon={Heart}
              loading={loading}
            />
            <StatCard
              label="Assigned"
              value={stats?.prayer?.assigned}
              href="/admin/prayer?status=assigned"
              icon={Heart}
              loading={loading}
            />
            <StatCard
              label="Praying"
              value={stats?.prayer?.praying}
              href="/admin/prayer?status=praying"
              icon={Heart}
              loading={loading}
            />
            <StatCard
              label="Answered"
              value={stats?.prayer?.answered}
              href="/admin/prayer?status=answered"
              icon={Heart}
              loading={loading}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>From the security and administration audit log.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No administrative activity has been recorded yet.
              </p>
            ) : (
              <ul className="divide-y">
                {activity.map((item) => (
                  <li key={item.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.summary}</p>
                      <p className="text-xs text-muted-foreground">{item.user?.name || 'System'}</p>
                    </div>
                    <time className="text-xs text-muted-foreground" dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Only actions you are authorized to perform.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No quick actions are available for your role.
              </p>
            ) : (
              actions.map((action) => (
                <Button key={action.href} asChild variant="outline" className="justify-start">
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
