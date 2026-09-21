import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { guardPrayerAdminRead } from '@/lib/prayer/guard';

export async function GET(request: Request) {
  const auth = await guardPrayerAdminRead(request, 'view');
  if (!auth.ok) return auth.error;

  const [categories, assignees] = await Promise.all([
    db.prayerCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    }),
    db.user.findMany({
      where: {
        status: 'active',
        role: { slug: { in: ['prayer_team', 'pastor', 'admin', 'super_admin'] } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: { select: { name: true, slug: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 100,
    }),
  ]);

  const prayerAssignees = assignees;

  return success({
    categories,
    assignees: prayerAssignees.map((user) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role.name,
    })),
  });
}
