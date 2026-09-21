import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { listContinueWatching } from '@/lib/library/progress';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const items = await listContinueWatching(auth.user.id);
  return success({ items });
}
