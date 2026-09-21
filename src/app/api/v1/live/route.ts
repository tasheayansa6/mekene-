import { success } from '@/lib/api/response';
import { optionalAuth } from '@/lib/auth/authorize';
import { getLiveNow, getUpcomingLive } from '@/lib/live/public';

export async function GET(request: Request) {
  const { user } = await optionalAuth(request);
  const [liveNow, upcoming] = await Promise.all([getLiveNow(user), getUpcomingLive(user)]);
  return success({ liveNow, upcoming });
}
