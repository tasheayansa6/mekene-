import { success } from '@/lib/api/response';
import { optionalAuth } from '@/lib/auth/authorize';
import { getUpcomingLive } from '@/lib/live/public';

export async function GET(request: Request) {
  const { user } = await optionalAuth(request);
  const upcoming = await getUpcomingLive(user);
  return success(upcoming);
}
