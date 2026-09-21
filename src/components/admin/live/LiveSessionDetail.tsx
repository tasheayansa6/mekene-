'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { LiveStatusBadge } from '@/components/live/LiveStatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { publicErrorMessage } from '@/lib/admin/http-error';
import { formatInTimeZone, toZonedLocalInput } from '@/lib/events/timezone';

interface LiveSession {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  displayStatus: string;
  isLive: boolean;
  provider: string;
  streamUrl: string | null;
  embedUrl: string | null;
  backupStreamUrl: string | null;
  visibility: string;
  chatEnabled: boolean;
  prayerEnabled: boolean;
  attendanceEnabled: boolean;
  reactionsEnabled: boolean;
  pollsEnabled: boolean;
  scheduledStartAt: string;
  scheduledEndAt: string | null;
  timezone: string;
  peakViewers: number;
  approximateViewers: number;
  currentProgramItemId: string | null;
  recordingSermonId: string | null;
  eventId: string;
  event: { id: string; title: string; slug: string } | null;
  recordingSermon: { id: string; title: string; slug: string } | null;
}

interface ProgramItem {
  id: string;
  title: string;
  itemType: string;
  status: string;
}

interface ChatMessage {
  id: string;
  displayName: string;
  body: string;
  status: string;
  createdAt: string;
}

interface PrayerRow {
  id: string;
  body: string;
  isPrivate: boolean;
  status: string;
  name: string | null;
  createdAt: string;
}

interface PollRow {
  id: string;
  question: string;
  status: string;
  results?: { optionId: string; label: string; count: number }[];
}

interface SessionReport {
  metrics: {
    attendanceCount: number;
    chatCount: number;
    prayerCount: number;
    reactionCount: number;
    peakViewers: number;
    approximateViewers: number;
  };
}

interface SermonOption {
  id: string;
  title: string;
  slug: string;
}

export function LiveSessionDetail({ id }: { id: string }) {
  const { can } = useAuth();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [programItems, setProgramItems] = useState<ProgramItem[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [prayers, setPrayers] = useState<PrayerRow[]>([]);
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [sermons, setSermons] = useState<SermonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [announcementBody, setAnnouncementBody] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState('Yes\nNo');
  const [recordingSermonId, setRecordingSermonId] = useState('');
  const [reminderOffsets, setReminderOffsets] = useState('60,15');
  const [streamForm, setStreamForm] = useState({
    streamUrl: '',
    backupStreamUrl: '',
    provider: 'youtube',
    visibility: 'public',
    chatEnabled: true,
    prayerEnabled: true,
    attendanceEnabled: true,
    reactionsEnabled: true,
    pollsEnabled: false,
  });

  const canManage = can('events.manage') || can('events.moderate');

  const loadSession = useCallback(async () => {
    const result = await apiGet<LiveSession>(`/admin/live/${id}`);
    if (result.success && result.data) {
      setSession(result.data);
      setStreamForm({
        streamUrl: result.data.streamUrl || '',
        backupStreamUrl: result.data.backupStreamUrl || '',
        provider: result.data.provider,
        visibility: result.data.visibility,
        chatEnabled: result.data.chatEnabled,
        prayerEnabled: result.data.prayerEnabled,
        attendanceEnabled: result.data.attendanceEnabled,
        reactionsEnabled: result.data.reactionsEnabled,
        pollsEnabled: result.data.pollsEnabled,
      });
      setRecordingSermonId(result.data.recordingSermonId || '');
    }
    setLoading(false);
  }, [id]);

  const loadExtras = useCallback(async () => {
    if (!session?.eventId) return;
    const [program, chatResult, prayerResult, pollResult, reportResult, sermonResult] =
      await Promise.all([
        apiGet<{ items: ProgramItem[] }>(`/admin/events/${session.eventId}/program`),
        apiGet<ChatMessage[]>(`/admin/live/${id}/chat`),
        apiGet<PrayerRow[]>(`/admin/live/${id}/prayer`),
        apiGet<PollRow[]>(`/admin/live/${id}/polls`),
        apiGet<SessionReport>(`/admin/live/${id}/report`),
        apiGet<SermonOption[]>('/admin/sermons', { page: '1', pageSize: '30', sort: 'sermonDate', dir: 'desc' }),
      ]);
    if (program.success && program.data) setProgramItems(program.data.items || []);
    if (chatResult.success && chatResult.data) setChat(chatResult.data);
    if (prayerResult.success && prayerResult.data) setPrayers(prayerResult.data);
    if (pollResult.success && pollResult.data) setPolls(pollResult.data);
    if (reportResult.success && reportResult.data) setReport(reportResult.data);
    if (sermonResult.success && sermonResult.data) setSermons(sermonResult.data);
  }, [id, session?.eventId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (session) void loadExtras();
  }, [session, loadExtras]);

  async function runAction(path: string, label: string) {
    setPending(true);
    const result = await apiPost(`/admin/live/${id}/${path}`);
    setPending(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success(result.message || `${label} completed.`);
    void loadSession();
  }

  async function saveStreamConfig() {
    setPending(true);
    const result = await apiPatch(`/admin/live/${id}`, streamForm);
    setPending(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Stream configuration saved.');
    void loadSession();
  }

  async function hideMessage(messageId: string) {
    const result = await apiPost(`/admin/live/${id}/chat`, {
      action: 'hide',
      messageId,
    });
    if (!result.success) {
      toast.error(result.message || 'Could not hide message.');
      return;
    }
    toast.success('Message hidden.');
    void loadExtras();
  }

  async function updatePrayerStatus(prayerId: string, status: string) {
    const result = await apiPatch(`/admin/live/${id}/prayer`, { prayerId, status });
    if (!result.success) {
      toast.error(result.message || 'Could not update prayer.');
      return;
    }
    toast.success('Prayer updated.');
    void loadExtras();
  }

  async function postAnnouncement() {
    const result = await apiPost(`/admin/live/${id}/announcements`, {
      body: announcementBody,
      isPinned: true,
    });
    if (!result.success) {
      toast.error(result.message || 'Could not post announcement.');
      return;
    }
    toast.success('Announcement posted.');
    setAnnouncementBody('');
  }

  async function createPoll() {
    const options = pollOptions.split('\n').map((line) => line.trim()).filter(Boolean);
    const result = await apiPost(`/admin/live/${id}/polls`, {
      question: pollQuestion,
      options,
    });
    if (!result.success) {
      toast.error(result.message || 'Could not create poll.');
      return;
    }
    toast.success('Poll created.');
    setPollQuestion('');
    void loadExtras();
  }

  async function activatePoll(pollId: string) {
    const result = await apiPost(`/admin/live/${id}/polls`, { action: 'activate', pollId });
    if (!result.success) {
      toast.error(result.message || 'Could not activate poll.');
      return;
    }
    toast.success('Poll activated.');
    void loadExtras();
  }

  async function setActiveProgramItem(programItemId: string) {
    const result = await apiPost(`/admin/live/${id}/program/active`, { programItemId });
    if (!result.success) {
      toast.error(result.message || 'Could not update program.');
      return;
    }
    toast.success('Active program item updated.');
    void loadSession();
  }

  async function associateRecording() {
    if (!recordingSermonId) {
      toast.error('Select a sermon recording.');
      return;
    }
    const result = await apiPost(`/admin/live/${id}/recording`, { sermonId: recordingSermonId });
    if (!result.success) {
      toast.error(result.message || 'Could not associate recording.');
      return;
    }
    toast.success('Recording associated.');
    void loadSession();
  }

  async function sendReminders() {
    const offsets = reminderOffsets
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => !Number.isNaN(value) && value > 0);
    const result = await apiPost(`/admin/live/${id}/reminders`, {
      reminderOffsetsMinutes: offsets,
    });
    if (!result.success) {
      toast.error(result.message || 'Could not schedule reminders.');
      return;
    }
    toast.success(result.message || 'Reminders scheduled.');
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading live session…
      </div>
    );
  }

  if (!session) {
    return <p className="text-destructive">Live session not found.</p>;
  }

  return (
    <PermissionGate permission="events.view">
      <div className="space-y-6">
        <PageHeader
          title={session.title}
          description={session.event ? `Linked to ${session.event.title}` : 'Live worship session'}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/live/${session.slug}`} target="_blank">
                  View public page
                </Link>
              </Button>
              {session.event ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/events/${session.event.id}/program`}>Edit event program</Link>
                </Button>
              ) : null}
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <LiveStatusBadge status={session.displayStatus} pulse={session.isLive} />
          <Badge variant="outline">{session.visibility}</Badge>
          <span className="text-sm text-muted-foreground">
            {formatInTimeZone(session.scheduledStartAt, session.timezone, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stream">Stream</TabsTrigger>
            <TabsTrigger value="program">Program</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="prayer">Prayer</TabsTrigger>
            <TabsTrigger value="polls">Polls</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="recording">Recording</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Status controls</CardTitle>
                <CardDescription>Activate, pause, end, or cancel this session.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {canManage ? (
                  <>
                    <Button disabled={pending} onClick={() => void runAction('activate', 'Activate')}>
                      Go live
                    </Button>
                    <Button disabled={pending} variant="secondary" onClick={() => void runAction('pause', 'Pause')}>
                      Pause
                    </Button>
                    <Button disabled={pending} variant="outline" onClick={() => void runAction('end', 'End')}>
                      End stream
                    </Button>
                    <Button disabled={pending} variant="destructive" onClick={() => void runAction('cancel', 'Cancel')}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">You do not have manage permission.</p>
                )}
              </CardContent>
            </Card>
            {report ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Card><CardHeader className="pb-2"><CardDescription>Attendance</CardDescription><CardTitle>{report.metrics.attendanceCount}</CardTitle></CardHeader></Card>
                <Card><CardHeader className="pb-2"><CardDescription>Chat messages</CardDescription><CardTitle>{report.metrics.chatCount}</CardTitle></CardHeader></Card>
                <Card><CardHeader className="pb-2"><CardDescription>Prayer requests</CardDescription><CardTitle>{report.metrics.prayerCount}</CardTitle></CardHeader></Card>
                <Card><CardHeader className="pb-2"><CardDescription>Reactions</CardDescription><CardTitle>{report.metrics.reactionCount}</CardTitle></CardHeader></Card>
                <Card><CardHeader className="pb-2"><CardDescription>Peak viewers</CardDescription><CardTitle>{report.metrics.peakViewers}</CardTitle></CardHeader></Card>
                <Card><CardHeader className="pb-2"><CardDescription>Approx. viewers</CardDescription><CardTitle>{report.metrics.approximateViewers}</CardTitle></CardHeader></Card>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="stream" className="space-y-4 pt-4">
            <Card>
              <CardHeader><CardTitle>Stream configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={streamForm.provider} onValueChange={(v) => setStreamForm((s) => ({ ...s, provider: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="external">External</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Visibility</Label>
                    <Select value={streamForm.visibility} onValueChange={(v) => setStreamForm((s) => ({ ...s, visibility: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="members">Members</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Stream URL</Label>
                  <Input value={streamForm.streamUrl} onChange={(e) => setStreamForm((s) => ({ ...s, streamUrl: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Backup stream URL</Label>
                  <Input value={streamForm.backupStreamUrl} onChange={(e) => setStreamForm((s) => ({ ...s, backupStreamUrl: e.target.value }))} />
                </div>
                {session.embedUrl ? (
                  <p className="text-sm text-muted-foreground">Resolved embed: {session.embedUrl}</p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ['chatEnabled', 'Chat'],
                      ['prayerEnabled', 'Prayer'],
                      ['attendanceEnabled', 'Attendance'],
                      ['reactionsEnabled', 'Reactions'],
                      ['pollsEnabled', 'Polls'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between rounded-md border p-3">
                      <Label>{label}</Label>
                      <Switch checked={streamForm[key]} onCheckedChange={(checked) => setStreamForm((s) => ({ ...s, [key]: checked }))} />
                    </div>
                  ))}
                </div>
                <Button disabled={pending || !canManage} onClick={() => void saveStreamConfig()}>Save configuration</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="program" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Active program item</CardTitle>
                <CardDescription>Highlight the current segment on the public live page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {programItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No program items. Add items on the linked event program page.</p>
                ) : (
                  programItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.itemType}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={session.currentProgramItemId === item.id ? 'default' : 'outline'}
                        disabled={!canManage}
                        onClick={() => void setActiveProgramItem(item.id)}
                      >
                        {session.currentProgramItemId === item.id ? 'Current' : 'Set current'}
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="space-y-4 pt-4">
            <Card>
              <CardHeader><CardTitle>Chat moderation</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {chat.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No chat messages yet.</p>
                ) : (
                  chat.map((message) => (
                    <div key={message.id} className="rounded-md border p-3 text-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-medium">{message.displayName}</span>
                        <Badge variant={message.status === 'visible' ? 'secondary' : 'outline'}>{message.status}</Badge>
                      </div>
                      <p>{message.body}</p>
                      {message.status === 'visible' && canManage ? (
                        <Button size="sm" variant="outline" className="mt-2" onClick={() => void hideMessage(message.id)}>
                          Hide
                        </Button>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prayer" className="space-y-4 pt-4">
            <Card>
              <CardHeader><CardTitle>Prayer requests</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {prayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No prayer requests submitted.</p>
                ) : (
                  prayers.map((prayer) => (
                    <div key={prayer.id} className="rounded-md border p-3 text-sm">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{prayer.isPrivate ? 'Private' : 'Public'}</Badge>
                        <Badge>{prayer.status}</Badge>
                      </div>
                      <p>{prayer.body}</p>
                      {canManage ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(['reviewed', 'prayed', 'archived'] as const).map((status) => (
                            <Button key={status} size="sm" variant="outline" onClick={() => void updatePrayerStatus(prayer.id, status)}>
                              Mark {status}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="polls" className="space-y-4 pt-4">
            <Card>
              <CardHeader><CardTitle>Create poll</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Poll question" />
                <Textarea value={pollOptions} onChange={(e) => setPollOptions(e.target.value)} placeholder="One option per line" rows={4} />
                <Button disabled={!canManage} onClick={() => void createPoll()}>Create poll</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Polls</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {polls.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No polls yet.</p>
                ) : (
                  polls.map((poll) => (
                    <div key={poll.id} className="rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-medium">{poll.question}</p>
                        <Badge>{poll.status}</Badge>
                      </div>
                      {poll.results?.map((option) => (
                        <p key={option.optionId} className="text-sm text-muted-foreground">
                          {option.label}: {option.count}
                        </p>
                      ))}
                      {poll.status !== 'active' && canManage ? (
                        <Button size="sm" className="mt-2" onClick={() => void activatePoll(poll.id)}>Activate</Button>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements" className="space-y-4 pt-4">
            <Card>
              <CardHeader><CardTitle>Post announcement</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} rows={3} placeholder="Announcement for viewers…" />
                <Button disabled={!canManage || !announcementBody.trim()} onClick={() => void postAnnouncement()}>Post announcement</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recording" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Associate recording</CardTitle>
                <CardDescription>Link a published sermon for the ended-stream recording CTA.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {session.recordingSermon ? (
                  <p className="text-sm">Current: {session.recordingSermon.title}</p>
                ) : null}
                <Select value={recordingSermonId} onValueChange={setRecordingSermonId}>
                  <SelectTrigger><SelectValue placeholder="Select sermon" /></SelectTrigger>
                  <SelectContent>
                    {sermons.map((sermon) => (
                      <SelectItem key={sermon.id} value={sermon.id}>{sermon.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button disabled={!canManage} onClick={() => void associateRecording()}>Save recording link</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Send reminders</CardTitle>
                <CardDescription>Comma-separated minutes before start (e.g. 60,15).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={reminderOffsets} onChange={(e) => setReminderOffsets(e.target.value)} />
                <Button disabled={!canManage} onClick={() => void sendReminders()}>Schedule reminders</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report" className="space-y-4 pt-4">
            <Card>
              <CardHeader><CardTitle>Session metrics</CardTitle></CardHeader>
              <CardContent>
                {report ? (
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(report.metrics).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-sm text-muted-foreground">{key}</dt>
                        <dd className="text-lg font-semibold">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">No report data available.</p>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  Scheduled start (local):{' '}
                  {toZonedLocalInput(new Date(session.scheduledStartAt), session.timezone)}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGate>
  );
}
