import { db } from '@/lib/db';
import { success, notFound } from '@/lib/api/response';
import { DAY_ORDER } from '../_lib/validation';

export async function GET() {
  const profile = await db.churchProfile.findFirst({
    where: { isActive: true, status: 'published' },
    include: {
      serviceSchedules: {
        where: { isActive: true },
      },
      locations: {
        where: { isActive: true },
      },
      socialLinks: {
        where: { isActive: true },
      },
    },
  });

  if (!profile) {
    return notFound('Church profile');
  }

  // Sort serviceSchedules: by sortOrder ASC, then dayOfWeek (Sunday=0...Saturday=6)
  const sortedSchedules = [...profile.serviceSchedules].sort((a, b) => {
    const orderDiff = a.sortOrder - b.sortOrder;
    if (orderDiff !== 0) return orderDiff;
    return (DAY_ORDER[a.dayOfWeek] ?? 99) - (DAY_ORDER[b.dayOfWeek] ?? 99);
  });

  // Sort socialLinks: by sortOrder ASC
  const sortedSocialLinks = [...profile.socialLinks].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  // Locations: isMainLocation=true first, then by createdAt
  const sortedLocations = [...profile.locations].sort((a, b) => {
    if (a.isMainLocation && !b.isMainLocation) return -1;
    if (!a.isMainLocation && b.isMainLocation) return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return success({
    ...profile,
    serviceSchedules: sortedSchedules,
    locations: sortedLocations,
    socialLinks: sortedSocialLinks,
  });
}
