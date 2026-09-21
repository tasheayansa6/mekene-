import { db } from '@/lib/db';
import { success, error, validationError } from '@/lib/api/response';
import { checkAdminAuth } from '../../_lib/auth';
import { auditChurchChange } from '../../_lib/audit';
import {
  socialLinkCreateSchema,
  formatZodErrors,
} from '../../_lib/validation';

export async function POST(request: Request) {
  const auth = await checkAdminAuth(request, 'create');
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

  await auditChurchChange(request, auth.user.id, 'create', 'social_link', socialLink.id, {
    platform: socialLink.platform,
  });

  return success(socialLink, 'Social link created', 201);
}
