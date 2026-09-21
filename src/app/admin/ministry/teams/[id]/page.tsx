'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { publicErrorMessage } from '@/lib/admin/http-error';

interface TeamMember {
  id: string;
  roleLabel: string | null;
  status: string;
  member: { id: string; name: string; membershipNumber: string | null } | null;
}

interface TeamDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  ministry: { id: string; name: string } | null;
  leaderUser: { id: string; name: string | null } | null;
  members: TeamMember[];
}

export default function TeamDetailPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberHits, setMemberHits] = useState<
    Array<{ id: string; displayName: string; membershipNumber: string | null }>
  >([]);
  const [roleLabel, setRoleLabel] = useState('');
  const [selectedMember, setSelectedMember] = useState<{ id: string; label: string } | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  function load() {
    void apiGet<TeamDetail>(`/admin/ministry/teams/${params.id}`).then((result) => {
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }
      setError(null);
      setTeam(result.data);
    });
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function searchMembers(value: string) {
    setMemberQuery(value);
    if (value.trim().length < 2) {
      setMemberHits([]);
      return;
    }
    const result = await apiGet<
      Array<{ id: string; displayName: string; membershipNumber: string | null }>
    >('/admin/members', { q: value.trim(), pageSize: '8', status: 'active' });
    setMemberHits(result.data || []);
  }

  async function addMember() {
    if (!selectedMember) {
      toast.error('Select a member.');
      return;
    }
    setSaving(true);
    const result = await apiPost(`/admin/ministry/teams/${params.id}/members`, {
      memberId: selectedMember.id,
      roleLabel: roleLabel.trim() || null,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Saved');
    setSelectedMember(null);
    setRoleLabel('');
    load();
  }

  async function toggleActive() {
    if (!team) return;
    const result = await apiPatch(`/admin/ministry/teams/${team.id}`, {
      isActive: !team.isActive,
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Updated');
    load();
  }

  return (
    <PermissionGate permission="ministries.view">
      <div className="space-y-6">
        <PageHeader
          title={team?.name || 'Team'}
          description={team?.ministry?.name || 'Ministry team detail'}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/ministry/teams">All teams</Link>
              </Button>
              {can('ministries.assign') && team ? (
                <Button type="button" variant="secondary" onClick={() => void toggleActive()}>
                  {team.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              ) : null}
            </div>
          }
        />

        {error ? <ApiErrorAlert message={error} /> : null}
        {!team && !error ? <Skeleton className="h-48 w-full" /> : null}

        {team ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardDescription>Status</CardDescription>
                  <CardTitle>
                    <Badge variant={team.isActive ? 'secondary' : 'outline'}>
                      {team.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Leader</CardDescription>
                  <CardTitle className="text-lg">{team.leaderUser?.name || '—'}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Members</CardDescription>
                  <CardTitle>{team.members?.length || 0}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {team.description ? (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                  <CardDescription>{team.description}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {can('ministries.assign') && (
              <Card>
                <CardHeader>
                  <CardTitle>Add member</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedMember ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                      <span>{selectedMember.label}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedMember(null)}
                      >
                        Clear
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Input
                        value={memberQuery}
                        onChange={(event) => void searchMembers(event.target.value)}
                        placeholder="Search members…"
                      />
                      {memberHits.length > 0 ? (
                        <div className="max-h-36 overflow-y-auto rounded-md border">
                          {memberHits.map((hit) => (
                            <button
                              key={hit.id}
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => {
                                setSelectedMember({ id: hit.id, label: hit.displayName });
                                setMemberHits([]);
                                setMemberQuery('');
                              }}
                            >
                              {hit.displayName}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="team-role">Role label</Label>
                    <Input
                      id="team-role"
                      value={roleLabel}
                      onChange={(event) => setRoleLabel(event.target.value)}
                    />
                  </div>
                  <Button type="button" disabled={saving} onClick={() => void addMember()}>
                    {saving ? 'Saving…' : 'Add member'}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(team.members || []).length === 0 ? (
                  <p className="text-muted-foreground">No members on this team yet.</p>
                ) : (
                  team.members.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
                    >
                      <div>
                        <p className="font-medium">{row.member?.name || '—'}</p>
                        <p className="text-muted-foreground">
                          {row.roleLabel || 'Member'}
                          {row.member?.membershipNumber
                            ? ` · ${row.member.membershipNumber}`
                            : ''}
                        </p>
                      </div>
                      <Badge variant="outline">{row.status}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </PermissionGate>
  );
}
