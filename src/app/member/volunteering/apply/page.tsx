'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
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
import { publicErrorMessage } from '@/lib/admin/http-error';

interface Participation {
  id: string;
  ministry: { id: string; name: string };
}

export default function MemberVolunteerApplyPage() {
  const [ministries, setMinistries] = useState<Participation[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ministryId: '',
    preferredMinistry: '',
    skills: '',
    experience: '',
    availability: '',
    motivation: '',
    preferredTimes: '',
  });

  useEffect(() => {
    void apiGet<{ ministries: Participation[] }>('/members/me/ministries').then((result) => {
      setMinistries(result.data?.ministries || []);
    });
  }, []);

  async function submit() {
    if (
      !form.ministryId &&
      form.preferredMinistry.trim().length < 2 &&
      form.motivation.trim().length < 3
    ) {
      toast.error('Share a preferred ministry or your motivation to serve.');
      return;
    }
    setSaving(true);
    const result = await apiPost('/members/me/volunteering/applications', {
      ministryId: form.ministryId || null,
      preferredMinistry: form.preferredMinistry.trim() || null,
      skills: form.skills.trim() || null,
      experience: form.experience.trim() || null,
      availability: form.availability.trim() || null,
      motivation: form.motivation.trim() || null,
      preferredTimes: form.preferredTimes.trim() || null,
      submit: true,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(publicErrorMessage(result.status, result.message));
      return;
    }
    toast.success('Saved');
    setForm({
      ministryId: '',
      preferredMinistry: '',
      skills: '',
      experience: '',
      availability: '',
      motivation: '',
      preferredTimes: '',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Apply to volunteer</h1>
          <p className="text-sm text-muted-foreground">
            Applications are reviewed by authorized ministry staff. Approval is never automatic.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/member/volunteering">Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application</CardTitle>
          <CardDescription>
            Share how you can serve. Private staff review notes are never shown here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ministries.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="apply-ministry">Ministry you already participate in</Label>
              <select
                id="apply-ministry"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.ministryId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, ministryId: event.target.value }))
                }
              >
                <option value="">General / not listed</option>
                {ministries.map((item) => (
                  <option key={item.ministry.id} value={item.ministry.id}>
                    {item.ministry.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="preferred-ministry">Preferred ministry</Label>
            <Input
              id="preferred-ministry"
              value={form.preferredMinistry}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, preferredMinistry: event.target.value }))
              }
              placeholder="e.g. Worship, Children, Outreach"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skills">Skills</Label>
            <Textarea
              id="skills"
              value={form.skills}
              onChange={(event) => setForm((prev) => ({ ...prev, skills: event.target.value }))}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience">Experience</Label>
            <Textarea
              id="experience"
              value={form.experience}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, experience: event.target.value }))
              }
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="availability">Availability</Label>
            <Textarea
              id="availability"
              value={form.availability}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, availability: event.target.value }))
              }
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred-times">Preferred times</Label>
            <Input
              id="preferred-times"
              value={form.preferredTimes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, preferredTimes: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivation">Motivation</Label>
            <Textarea
              id="motivation"
              value={form.motivation}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, motivation: event.target.value }))
              }
              rows={3}
            />
          </div>
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            {saving ? 'Submitting…' : 'Submit application'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
