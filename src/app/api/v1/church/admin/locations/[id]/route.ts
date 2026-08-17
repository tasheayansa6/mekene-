import { db } from '@/lib/db';
import { success, notFound, validationError } from '@/lib/api/response';
import { checkAdminAuth } from '../../../_lib/auth';
import {
  churchLocationUpdateSchema,
  formatZodErrors,
} from '../../../_lib/validation';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const auth = checkAdminAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;

  const existing = await db.churchLocation.findUnique({ where: { id } });
  if (!existing) {
    return notFound('Location');
  }

  const body = await request.json();
  const parsed = churchLocationUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  // If setting as main location, unset existing main location(s)
  if (parsed.data.isMainLocation) {
    await db.churchLocation.updateMany({
      where: {
        churchProfileId: existing.churchProfileId,
        isMainLocation: true,
        id: { not: id },
      },
      data: { isMainLocation: false },
    });
  }

  const updated = await db.churchLocation.update({
    where: { id },
    data: parsed.data,
  });

  return success(updated, 'Location updated');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = checkAdminAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;

  const existing = await db.churchLocation.findUnique({ where: { id } });
  if (!existing) {
    return notFound('Location');
  }

  await db.churchLocation.update({
    where: { id },
    data: { isActive: false },
  });

  return success({ id }, 'Location deleted');
}