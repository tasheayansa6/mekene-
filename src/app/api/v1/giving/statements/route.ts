import { requireAuth } from '@/lib/auth/authorize';
import { success } from '@/lib/api/response';
import { buildMemberGivingStatement } from '@/lib/giving/statements';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const year = url.searchParams.get('year');
  const statement = await buildMemberGivingStatement({
    userId: auth.user.id,
    yearLabel: year,
  });
  return success({ statement });
}
