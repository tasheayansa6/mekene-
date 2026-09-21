import { db } from '@/lib/db';
import { success, notFound, validationError } from '@/lib/api/response';
import { checkAdminAuth } from '../../_lib/auth';
import { auditChurchChange } from '../../_lib/audit';
import {
  churchProfileUpdateSchema,
  formatZodErrors,
  DAY_ORDER,
} from '../../_lib/validation';

export async function GET(request: Request) {
  const auth = await checkAdminAuth(request, 'view');
  if (!auth.ok) return auth.error;

  const profile = await db.churchProfile.findFirst({
    include: {
      serviceSchedules: true,
      locations: true,
      socialLinks: true,
    },
  });

  if (!profile) {
    return notFound('Church profile');
  }

  // Sort for admin view (same as public but includes inactive)
  const sortedSchedules = [...profile.serviceSchedules].sort((a, b) => {
    const orderDiff = a.sortOrder - b.sortOrder;
    if (orderDiff !== 0) return orderDiff;
    return (DAY_ORDER[a.dayOfWeek] ?? 99) - (DAY_ORDER[b.dayOfWeek] ?? 99);
  });

  const sortedSocialLinks = [...profile.socialLinks].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

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

export async function PUT(request: Request) {
  const auth = await checkAdminAuth(request, 'update');
  if (!auth.ok) return auth.error;

  const body = await request.json();
  const parsed = churchProfileUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const profile = await db.churchProfile.findFirst();

  if (!profile) {
    return notFound('Church profile');
  }

  const updated = await db.churchProfile.update({
    where: { id: profile.id },
    data: parsed.data,
  });

  await auditChurchChange(
    request,
    auth.user.id,
    'update',
    'church_profile',
    profile.id,
    { name: updated.name }
  );

  return success(updated, 'Profile updated successfully');
}
