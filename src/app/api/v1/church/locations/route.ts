import { db } from '@/lib/db';
import { success } from '@/lib/api/response';

export async function GET() {
  const profile = await db.churchProfile.findFirst({
    where: { isActive: true, status: 'published' },
    select: { id: true },
  });

  if (!profile) {
    return success([]);
  }

  const locations = await db.churchLocation.findMany({
    where: {
      churchProfileId: profile.id,
      isActive: true,
    },
    orderBy: [
      { isMainLocation: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  return success(locations);
}
