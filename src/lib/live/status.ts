import type { LiveSessionStatus, LiveVisibility } from '@prisma/client';
import type { AuthUser } from '@/lib/auth/permissions';
import { canViewLiveAdmin } from './access';

export const LIVE_STATUSES = [
  'scheduled',
  'starting_soon',
  'live',
  'paused',
  'ended',
  'cancelled',
  'failed',
] as const satisfies readonly LiveSessionStatus[];

export type LiveStatusValue = (typeof LIVE_STATUSES)[number];

export type LiveDisplayStatus = LiveStatusValue | 'starting_soon';

const STARTING_SOON_MS = 15 * 60 * 1000;

export function deriveDisplayStatus(
  session: { status: LiveSessionStatus; scheduledStartAt: Date },
  now: Date = new Date()
): LiveDisplayStatus {
  if (session.status === 'scheduled') {
    const msUntilStart = session.scheduledStartAt.getTime() - now.getTime();
    if (msUntilStart >= 0 && msUntilStart <= STARTING_SOON_MS) {
      return 'starting_soon';
    }
  }
  return session.status;
}

/** Public pages only treat a session as live when the DB status is live. */
export function isPubliclyLive(session: { status: LiveSessionStatus }): boolean {
  return session.status === 'live';
}

export function isListableStatus(status: LiveSessionStatus): boolean {
  return status !== 'cancelled' && status !== 'failed';
}

export function canPublicView(
  session: { visibility: LiveVisibility; status: LiveSessionStatus },
  user: AuthUser | null
): boolean {
  if (!isListableStatus(session.status)) return false;
  if (session.visibility === 'public') return true;
  if (session.visibility === 'members') return Boolean(user);
  if (session.visibility === 'private') return Boolean(user && canViewLiveAdmin(user));
  return false;
}
