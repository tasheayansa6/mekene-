import { notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { db } from '@/lib/db';
import { bookableResourceWriteSchema, formatZodErrors } from '@/lib/events/validation';
import { updateBookableResource } from '@/lib/events/resources';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'events', 'manage');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const existing = await db.bookableResource.findUnique({ where: { id } });
  if (!existing) return notFound('Resource');

  const parsed = bookableResourceWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const row = await updateBookableResource(id, parsed.data);
  return success(row, 'Resource updated.');
}
