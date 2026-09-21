import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'sermons', 'view');
  if (!auth.ok) return auth.error;
  const [categories, series, speakers] = await Promise.all([
    db.sermonCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    }),
    db.sermonSeries.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, status: true },
    }),
    db.leader.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, title: true },
    }),
  ]);
  return success({
    categories,
    series,
    speakers: speakers.map((person) => ({
      id: person.id,
      name: `${person.firstName} ${person.lastName}`.trim(),
      title: person.title,
    })),
  });
}
