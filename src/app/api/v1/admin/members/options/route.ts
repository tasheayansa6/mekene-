import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewMembers } from '@/lib/members/access';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewMembers(auth.user)) return forbidden();

  const [households, ministries] = await Promise.all([
    db.household.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.ministry.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return success({ households, ministries });
}
