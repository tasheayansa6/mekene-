import { db } from '@/lib/db';
import { success, error, validationError } from '@/lib/api/response';
import { checkAdminAuth } from '../../_lib/auth';
import {
  serviceScheduleCreateSchema,
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
  const parsed = serviceScheduleCreateSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const service = await db.serviceSchedule.create({
    data: {
      ...parsed.data,
      churchProfileId: profile.id,
    },
  });

  return success(service, 'Service schedule created', 201);
}
