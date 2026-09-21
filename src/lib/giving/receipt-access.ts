import { canViewGiving } from './access';
import type { AuthUser } from '@/lib/auth/permissions';

/**
 * Guest gifts (no userId) may be viewed with the unguessable reference.
 * Member gifts require the owner or a finance-authorized staff user.
 */
export function canViewReceipt(
  contribution: { userId: string | null },
  viewer: AuthUser | null
): boolean {
  if (!contribution.userId) return true;
  if (!viewer) return false;
  if (viewer.id === contribution.userId) return true;
  return canViewGiving(viewer);
}
