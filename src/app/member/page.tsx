'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  ClipboardCheck,
  Heart,
  Radio,
  User,
  Users,
  UsersRound,
  HandHeart,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';

interface DashboardPayload {
  welcome: { firstName: string; displayName: string };
  member: { status: string; membershipNumber: string | null } | null;
  profileCompletion: { percent: number; missing: string[] };
  liveNow: { title: string; slug: string; isLive: boolean } | null;
  nextService: {
    title: string;
    slug: string;
    startAt: string;
    isWorship: boolean;
    isOnline: boolean;
  } | null;
  upcomingEvents: Array<{ title: string; slug: string; startAt: string }>;
  announcements: Array<{
    id: string;
    title: string;
    slug: string;
    priority: string;
    startAt: string;
    read: boolean;
  }>;
  giving: {
    total: string;
    currency: string;
    recent: Array<{ id: string; amount: string; currency: string; fund: string; createdAt: string }>;
  };
  prayer: Array<{ id: string; title: string; status: string }>;
  ministries: Array<{ name: string; slug: string }>;
  unreadNotifications: number;
  savedSermons: Array<{ title: string; slug: string }>;
}

const quickActions = [
  { title: 'Give', href: '/give/now', icon: HandHeart },
  { title: 'Watch live', href: '/live', icon: Radio },
  { title: 'Events', href: '/member/events', icon: Calendar },
  { title: 'Prayer request', href: '/prayer/request', icon: Heart },
  { title: 'My profile', href: '/member/profile', icon: User },
  { title: 'My family', href: '/member/family', icon: Users },
  { title: 'My ministries', href: '/member/ministries', icon: UsersRound },
  { title: 'Check-in', href: '/member/check-in', icon: ClipboardCheck },
];

export default function MemberDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<DashboardPayload>('/member/dashboard').then((result) => {
      setData(result.data);
      setError(result.success ? null : result.message);
    });
  }, []);

  if (!data && !error) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return <ApiErrorAlert message={error || 'Unable to load your dashboard.'} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Welcome, {data.welcome.firstName}</h1>
        <p className="text-sm text-muted-foreground">
          {data.member
            ? `Membership status: ${data.member.status}${
                data.member.membershipNumber ? ` · ${data.member.membershipNumber}` : ''
              }`
            : 'A website account is not church membership.'}
        </p>
        {!data.member ? (
          <Button asChild className="mt-3">
            <Link href="/membership/apply">Apply for membership</Link>
          </Button>
        ) : null}
      </div>

      {data.profileCompletion.percent < 100 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Complete your profile</CardTitle>
            <CardDescription>
              {data.profileCompletion.missing.join(', ') || 'A few details are still missing.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={data.profileCompletion.percent} aria-label="Profile completion" />
            <Button asChild variant="outline" size="sm">
              <Link href="/member/onboarding">Continue setup</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {data.liveNow ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-lg">LIVE NOW</CardTitle>
            <CardDescription>{data.liveNow.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/live/${data.liveNow.slug}`}>Watch live</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming service</CardTitle>
            <CardDescription>
              {data.nextService
                ? `${data.nextService.title} · ${new Date(data.nextService.startAt).toLocaleString()}`
                : 'No upcoming service is listed yet.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={data.nextService ? `/member/events/${data.nextService.slug}` : '/member/services'}>
                View services
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notifications</CardTitle>
            <CardDescription>
              {data.unreadNotifications
                ? `${data.unreadNotifications} unread`
                : 'You are caught up.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/member/notifications">
                <Bell className="mr-2 size-4" />
                Open inbox
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md border px-3 py-3 text-sm hover:bg-muted/40"
              >
                <Icon className="size-4 text-primary" />
                {item.title}
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground">No upcoming events.</p>
            ) : (
              data.upcomingEvents.map((row) => (
                <p key={row.slug}>
                  <Link className="underline" href={`/member/events/${row.slug}`}>
                    {row.title}
                  </Link>{' '}
                  · {new Date(row.startAt).toLocaleDateString()}
                </p>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.announcements.length === 0 ? (
              <p className="text-muted-foreground">No announcements right now.</p>
            ) : (
              data.announcements.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="block w-full text-left underline"
                  onClick={() => {
                    void apiPost(`/member/announcements/${row.id}/read`);
                    window.location.href = `/member/announcements`;
                  }}
                >
                  {row.read ? row.title : <strong>{row.title}</strong>}
                </button>
              ))
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href="/member/announcements">
                All announcements <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Giving</CardTitle>
            <CardDescription>
              {data.giving.total} {data.giving.currency} recorded
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.giving.recent.length === 0 ? (
              <p className="text-muted-foreground">No gifts on file yet.</p>
            ) : (
              data.giving.recent.slice(0, 3).map((row) => (
                <p key={row.id}>
                  {row.fund} · {row.amount} {row.currency}
                </p>
              ))
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/member/giving">My giving</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prayer & ministries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.prayer.length === 0 ? (
              <p className="text-muted-foreground">No prayer requests yet.</p>
            ) : (
              data.prayer.map((row) => (
                <p key={row.id}>
                  <Link className="underline" href={`/member/prayer/${row.id}`}>
                    {row.title}
                  </Link>
                </p>
              ))
            )}
            {data.ministries.length > 0 ? (
              <p className="text-muted-foreground">
                Ministries: {data.ministries.map((row) => row.name).join(', ')}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saved sermons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.savedSermons.length === 0 ? (
              <p className="text-muted-foreground">Save sermons from the library.</p>
            ) : (
              data.savedSermons.map((row) => (
                <p key={row.slug}>
                  <Link className="underline" href={`/sermons/${row.slug}`}>
                    {row.title}
                  </Link>
                </p>
              ))
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href="/member/saved">
                <BookOpen className="mr-2 size-4" />
                Saved content
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
