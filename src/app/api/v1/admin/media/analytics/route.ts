import { success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { aggregatePopular, getAdminMediaAnalytics } from '@/lib/library/analytics';

async function guardMediaRead(request: Request) {
  let auth = await guardAdminRead(request, 'media', 'view');
  if (!auth.ok) auth = await guardAdminRead(request, 'sermons', 'view');
  return auth;
}

export async function GET(request: Request) {
  const auth = await guardMediaRead(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const periodDays = Math.min(365, Math.max(1, Number(url.searchParams.get('periodDays') || 30)));

  const [analytics, popular] = await Promise.all([
    getAdminMediaAnalytics(),
    aggregatePopular(periodDays),
  ]);

  return success({ analytics, popular });
}
