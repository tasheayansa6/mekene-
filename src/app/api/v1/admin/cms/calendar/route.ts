import { success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { getCmsCalendar } from '@/lib/cms/admin';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;

  const items = await getCmsCalendar(
    fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined,
    toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined
  );

  return success(
    items.map((item) => ({
      ...item,
      publishAt: item.publishAt?.toISOString() ?? null,
    }))
  );
}
