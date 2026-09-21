import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canMutateEventRecord, eventWhereForUser } from '@/lib/events/access';
import { formatZodErrors, programItemWriteSchema } from '@/lib/events/validation';
import { deleteProgramItem, updateProgramItem } from '@/lib/events/program';

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

async function loadEvent(id: string, user: Parameters<typeof eventWhereForUser>[0]) {
  const scoped = eventWhereForUser(user);
  return db.event.findFirst({
    where: scoped ? { AND: [{ id }, scoped] } : { id },
  });
}

async function loadItem(eventId: string, itemId: string) {
  return db.serviceProgramItem.findFirst({
    where: { id: itemId, program: { eventId } },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'events', 'update');
  if (!auth.ok) return auth.error;
  const { id, itemId } = await context.params;
  const event = await loadEvent(id, auth.user);
  if (!event) return notFound('Event');
  if (!canMutateEventRecord(auth.user, event)) return forbidden();
  const existing = await loadItem(id, itemId);
  if (!existing) return notFound('Program item');

  const parsed = programItemWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const item = await updateProgramItem(itemId, parsed.data);
  return success(item, 'Program item updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'events', 'update');
  if (!auth.ok) return auth.error;
  const { id, itemId } = await context.params;
  const event = await loadEvent(id, auth.user);
  if (!event) return notFound('Event');
  if (!canMutateEventRecord(auth.user, event)) return forbidden();
  const existing = await loadItem(id, itemId);
  if (!existing) return notFound('Program item');

  await deleteProgramItem(itemId);
  return success({ id: itemId }, 'Program item removed.');
}
