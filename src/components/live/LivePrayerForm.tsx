'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { apiPost, ensureCsrfToken } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LivePrayerForm({ slug, enabled }: { slug: string; enabled: boolean }) {
  const [body, setBody] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!enabled) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length < 5) {
      toast.error('Please share a brief prayer request (at least 5 characters).');
      return;
    }
    setSubmitting(true);
    await ensureCsrfToken();
    const result = await apiPost(`/live/${slug}/prayer`, { body: trimmed, isPrivate });
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.message || 'Could not submit prayer request.');
      return;
    }
    toast.success('Prayer request submitted.');
    setBody('');
    setSubmitted(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Submit a prayer request</CardTitle>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <p className="text-sm text-muted-foreground" role="status">
            Thank you. Your prayer request has been received.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="live-prayer-body">Prayer request</Label>
              <Textarea
                id="live-prayer-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Share your prayer need…"
                rows={4}
                maxLength={2000}
                disabled={submitting}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="live-prayer-private"
                checked={isPrivate}
                onCheckedChange={(checked) => setIsPrivate(checked === true)}
                disabled={submitting}
              />
              <Label htmlFor="live-prayer-private" className="font-normal">
                Keep this request private (visible to pastoral team only)
              </Label>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Submit prayer
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
