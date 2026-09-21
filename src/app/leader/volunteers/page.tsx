'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface LeaderData {
  teams: Array<{ id: string; name: string; memberCount: number; canManage?: boolean }>;
  upcoming: Array<{
    id: string;
    roleName: string;
    statusLabel: string;
    scheduledAt: string;
    member: { name: string } | null;
    event: { title: string } | null;
  }>;
  substitutions: Array<{
    id: string;
    assignmentId: string;
    roleName: string;
    scheduledAt: string;
    reason: string | null;
  }>;
  applications: Array<{ id: string; status: string; preferredMinistry: string | null }>;
}

export default function LeaderVolunteersPage() {
  const [data, setData] = useState<LeaderData | null>(null);
  const [announceTeamId, setAnnounceTeamId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [subId, setSubId] = useState('');
  const [substituteMemberId, setSubstituteMemberId] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    void apiGet<LeaderData>('/leader/volunteers').then((result) => {
      if (result.success && result.data) setData(result.data);
      else setData({ teams: [], upcoming: [], substitutions: [], applications: [] });
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function sendAnnouncement() {
    if (!announceTeamId || !title.trim() || !message.trim()) {
      toast.error('Choose a team and write a short announcement.');
      return;
    }
    setSaving(true);
    const result = await apiPost('/leader/volunteers/announcements', {
      teamId: announceTeamId,
      title: title.trim(),
      message: message.trim(),
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Sent');
    setTitle('');
    setMessage('');
  }

  async function approveSub() {
    if (!subId || !substituteMemberId.trim()) {
      toast.error('Select a substitution and substitute member id.');
      return;
    }
    setSaving(true);
    const result = await apiPost('/leader/volunteers/substitutions', {
      substitutionId: subId,
      substituteMemberId: substituteMemberId.trim(),
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Substitute assigned');
    setSubId('');
    setSubstituteMemberId('');
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Team volunteering</h1>
          <p className="text-sm text-muted-foreground">
            Manage only the teams and ministries you are authorized to lead.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/ministry/assignments">Full schedule</Link>
        </Button>
      </div>

      {!data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>Teams</CardDescription>
                <CardTitle>{data.teams.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Upcoming</CardDescription>
                <CardTitle>{data.upcoming.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Substitutions</CardDescription>
                <CardTitle>{data.substitutions.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Applications</CardDescription>
                <CardTitle>{data.applications.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your teams</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.teams.length === 0 ? (
                <p className="text-muted-foreground">No teams assigned to you.</p>
              ) : (
                data.teams.map((team) => (
                  <p key={team.id}>
                    {team.name} · {team.memberCount} members
                  </p>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.upcoming.map((row) => (
                <p key={row.id}>
                  {new Date(row.scheduledAt).toLocaleString()} · {row.roleName}
                  {row.member?.name ? ` · ${row.member.name}` : ''}
                  {row.event?.title ? ` · ${row.event.title}` : ''} ·{' '}
                  <Badge variant="secondary">{row.statusLabel}</Badge>
                </p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approve substitution</CardTitle>
              <CardDescription>
                Recommendations never auto-assign. Choose an eligible substitute.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="sub-id">Open request</Label>
                <select
                  id="sub-id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={subId}
                  onChange={(event) => setSubId(event.target.value)}
                >
                  <option value="">Select…</option>
                  {data.substitutions.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.roleName} · {new Date(row.scheduledAt).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub-member">Substitute member id</Label>
                <Input
                  id="sub-member"
                  value={substituteMemberId}
                  onChange={(event) => setSubstituteMemberId(event.target.value)}
                />
              </div>
              <Button type="button" disabled={saving} onClick={() => void approveSub()}>
                Assign substitute
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team announcement</CardTitle>
              <CardDescription>Uses the church notification system. Keep messages general.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="announce-team">Team</Label>
                <select
                  id="announce-team"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={announceTeamId}
                  onChange={(event) => setAnnounceTeamId(event.target.value)}
                >
                  <option value="">Select…</option>
                  {data.teams
                    .filter((team) => team.canManage !== false)
                    .map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="announce-title">Title</Label>
                <Input
                  id="announce-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="announce-message">Message</Label>
                <Textarea
                  id="announce-message"
                  rows={3}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>
              <Button type="button" disabled={saving} onClick={() => void sendAnnouncement()}>
                Send
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
