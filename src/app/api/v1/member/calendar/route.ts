import { success, error } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { getCalendarOccurrences } from '@/lib/events/public';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const now = new Date();
  const from = url.searchParams.get('from')
    ? new Date(url.searchParams.get('from') as string)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = url.searchParams.get('to')
    ? new Date(url.searchParams.get('to') as string)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return error('Provide a valid date range.', 422);
  }

  const occurrences = await getCalendarOccurrences(from, to);
  return success({
    from: from.toISOString(),
    to: to.toISOString(),
    occurrences,
  });
}
