import { db } from '@/lib/db';
import { success, notFound, validationError } from '@/lib/api/response';
import { checkAdminAuth } from '../../../_lib/auth';
import {
  socialLinkUpdateSchema,
  formatZodErrors,
} from '../../../_lib/validation';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const auth = checkAdminAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;

  const existing = await db.socialLink.findUnique({ where: { id } });
  if (!existing) {
    return notFound('Social link');
  }

  const body = await request.json();
  const parsed = socialLinkUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const updated = await db.socialLink.update({
    where: { id },
    data: parsed.data,
  });

  return success(updated, 'Social link updated');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = checkAdminAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;

  const existing = await db.socialLink.findUnique({ where: { id } });
  if (!existing) {
    return notFound('Social link');
  }

  await db.socialLink.update({
    where: { id },
    data: { isActive: false },
  });

  return success({ id }, 'Social link deleted');
}
