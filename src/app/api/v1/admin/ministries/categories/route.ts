import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { ministryWhereForUser } from '@/lib/admin/ministry-scope';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'ministries', 'view');
  if (!auth.ok) return auth.error;

  const scoped = ministryWhereForUser(auth.user);
  const ministries = await db.ministry.findMany({
    where: {
      ...(scoped || {}),
      category: { not: null },
    },
    select: { category: true },
  });

  const counts = new Map<string, number>();
  for (const ministry of ministries) {
    if (!ministry.category) continue;
    counts.set(ministry.category, (counts.get(ministry.category) || 0) + 1);
  }

  return success(
    Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );
}
