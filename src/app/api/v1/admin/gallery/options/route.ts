import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'gallery', 'view');
  if (!auth.ok) return auth.error;
  const [categories, ministries, events, sermons] = await Promise.all([
    db.galleryCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true },
    }),
    db.ministry.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    db.event.findMany({
      orderBy: { startAt: 'desc' },
      take: 80,
      select: { id: true, title: true, slug: true, status: true },
    }),
    db.sermon.findMany({
      where: { status: { in: ['published', 'draft', 'review'] } },
      orderBy: { sermonDate: 'desc' },
      take: 80,
      select: { id: true, title: true, slug: true, videoUrl: true, status: true },
    }),
  ]);
  return success({ categories, ministries, events, sermons });
}
