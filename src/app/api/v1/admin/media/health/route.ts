import { success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { scanBrokenMedia } from '@/lib/library/health';

async function guardMediaRead(request: Request) {
  let auth = await guardAdminRead(request, 'media', 'view');
  if (!auth.ok) auth = await guardAdminRead(request, 'sermons', 'view');
  return auth;
}

export async function GET(request: Request) {
  const auth = await guardMediaRead(request);
  if (!auth.ok) return auth.error;

  const health = await scanBrokenMedia();
  return success(health);
}
