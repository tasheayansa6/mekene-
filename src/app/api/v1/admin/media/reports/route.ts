import { success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { listOpenReports } from '@/lib/library/reports';

async function guardMediaRead(request: Request) {
  let auth = await guardAdminRead(request, 'media', 'view');
  if (!auth.ok) auth = await guardAdminRead(request, 'sermons', 'view');
  return auth;
}

export async function GET(request: Request) {
  const auth = await guardMediaRead(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const data = await listOpenReports({ page, pageSize });
  return success(data);
}
