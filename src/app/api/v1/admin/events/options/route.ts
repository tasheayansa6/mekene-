import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { assignedMinistryId } from '@/lib/events/write';
import { churchTimezone } from '@/lib/events/public';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'events', 'view');
  if (!auth.ok) return auth.error;
  const [categories, locations, ministries, leaders, assignedMinistry] = await Promise.all([
    db.eventCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    }),
    db.eventLocation.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, address: true },
    }),
    db.ministry.findMany({
      where: auth.user.role.slug === 'ministry_leader' ? { leaderUserId: auth.user.id } : { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    db.leader.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, title: true },
    }),
    assignedMinistryId(auth.user),
  ]);
  return success({
    categories,
    locations,
    ministries,
    assignedMinistryId: assignedMinistry,
    defaultTimezone: await churchTimezone(),
    leaders: leaders.map((person) => ({
      id: person.id,
      name: `${person.firstName} ${person.lastName}`.trim(),
      title: person.title,
    })),
  });
}
