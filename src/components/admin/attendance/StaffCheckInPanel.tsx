'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { publicErrorMessage } from '@/lib/admin/http-error';

interface SessionOption {
  id: string;
  title: string;
  statusLabel: string;
}

export function StaffCheckInPanel() {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [token, setToken] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [members, setMembers] = useState<
    Array<{ id: string; displayName: string; membershipNumber: string | null }>
  >([]);

  useEffect(() => {
    void apiGet<SessionOption[]>('/admin/attendance/sessions', {
      status: 'open',
      pageSize: '50',
    }).then((result) => {
      const rows = result.data || [];
      setSessions(rows);
      if (rows[0]) setSessionId(rows[0].id);
    });
  }, []);

  async function searchMembers(value: string) {
    setMemberQuery(value);
    if (value.trim().length < 2) {
      setMembers([]);
      return;
    }
    const result = await apiGet<
      Array<{ id: string; displayName: string; membershipNumber: string | null }>
    >('/admin/members', { q: value.trim(), pageSize: '8', status: 'active' });
    setMembers(result.data || []);
  }

  async function manualCheckIn(memberId: string) {
    if (!sessionId) return;
    const result = await apiPost('/admin/attendance/records', {
      sessionId,
      memberId,
      method: 'admin',
      status: 'present',
    });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Checked in.');
    setMemberQuery('');
    setMembers([]);
  }

  async function qrCheckIn() {
    const result = await apiPost('/attendance/check-in/qr', { token: token.trim() });
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(result.message || 'You are checked in.');
    setToken('');
  }

  return (
    <PermissionGate permission="attendance.create">
      <div className="space-y-6">
        <PageHeader
          title="Staff check-in"
          description="Manual member search with QR token fallback. Camera scanning can be added later; paste a session QR token for validation now."
        />

        <Card>
          <CardHeader>
            <CardTitle>Open session</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No attendance sessions are currently open.
              </p>
            ) : (
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger aria-label="Open session">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual check-in</CardTitle>
            <CardDescription>Search approved members by name or membership number.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={memberQuery}
              onChange={(e) => void searchMembers(e.target.value)}
              placeholder="Search members"
              aria-label="Search members for check-in"
            />
            <ul className="space-y-2 text-sm">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-2">
                  <span>
                    {member.displayName}
                    {member.membershipNumber ? ` · ${member.membershipNumber}` : ''}
                  </span>
                  <Button size="sm" onClick={() => void manualCheckIn(member.id)}>
                    Check in
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR token check-in</CardTitle>
            <CardDescription>
              Paste a short-lived session QR token. Invalid, expired, or closed-session tokens are
              rejected. Permanent member identity QR codes are not used.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="qr-token">Session QR token</Label>
              <Input
                id="qr-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
              />
            </div>
            <Button onClick={() => void qrCheckIn()} disabled={token.trim().length < 16}>
              Validate and check in
            </Button>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
