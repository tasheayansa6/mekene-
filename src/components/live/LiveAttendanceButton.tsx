'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Loader2 } from 'lucide-react';
import { apiPost, ensureCsrfToken } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

export function LiveAttendanceButton({ slug, enabled, isLive }: { slug: string; enabled: boolean; isLive: boolean }) {
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!enabled) return null;

  async function checkIn() {
    setLoading(true);
    await ensureCsrfToken();
    const result = await apiPost<{ checkedInAt?: string; alreadyCheckedIn?: boolean }>(
      `/live/${slug}/attendance`
    );
    setLoading(false);
    if (!result.success) {
      toast.error(result.message || 'Could not check in.');
      return;
    }
    setCheckedIn(true);
    if (result.data?.alreadyCheckedIn) {
      toast.message('You were already checked in.');
    } else {
      toast.success('Checked in successfully.');
    }
  }

  if (!isLive && !checkedIn) {
    return (
      <p className="text-sm text-muted-foreground">Attendance check-in opens when the stream is live.</p>
    );
  }

  if (checkedIn) {
    return (
      <Button variant="secondary" disabled className="gap-2" aria-live="polite">
        <Check className="size-4" aria-hidden />
        Checked in ✓
      </Button>
    );
  }

  return (
    <Button onClick={checkIn} disabled={loading || !isLive} className="gap-2">
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      Check in to service
    </Button>
  );
}
