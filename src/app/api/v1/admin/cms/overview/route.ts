import { success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { getCmsOverview } from '@/lib/cms/admin';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;
  const overview = await getCmsOverview();
  return success(overview);
}
