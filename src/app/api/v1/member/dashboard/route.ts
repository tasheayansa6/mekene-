import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { getMemberDashboard } from '@/lib/member-portal/dashboard';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;
  const data = await getMemberDashboard(auth.user);
  return success(data);
}
