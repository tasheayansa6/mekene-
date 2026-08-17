import { db } from '@/lib/db';
import { success, error, validationError } from '@/lib/api/response';
import { checkAdminAuth } from '../../_lib/auth';
import {
  socialLinkCreateSchema,
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
  const parsed = socialLinkCreateSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const socialLink = await db.socialLink.create({
    data: {
      ...parsed.data,
      churchProfileId: profile.id,
    },
  });

  return success(socialLink, 'Social link created', 201);
}
