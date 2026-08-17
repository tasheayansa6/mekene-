import { db } from '@/lib/db';
import { success, error, validationError } from '@/lib/api/response';
import { checkAdminAuth } from '../../_lib/auth';
import {
  churchLocationCreateSchema,
  formatZodErrors,
} from '../../_lib/validation';

export async function POST(request: Request) {
  const auth = checkAdminAuth(request);
  if (!auth.ok) return auth.error;

  // Ensure a church profile exists
  const profile = await db.churchProfile.findFirst();
  if (!profile) {
    return error('Church profile must be created first', 400);
  }

  const body = await request.json();
  const parsed = churchLocationCreateSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  // If setting as main location, unset any existing main location
  if (parsed.data.isMainLocation) {
    await db.churchLocation.updateMany({
      where: { churchProfileId: profile.id, isMainLocation: true },
      data: { isMainLocation: false },
    });
  }

  const location = await db.churchLocation.create({
    data: {
      ...parsed.data,
      churchProfileId: profile.id,
    },
  });

  return success(location, 'Location created', 201);
}
