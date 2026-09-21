import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canMutateEventRecord, eventWhereForUser } from '@/lib/events/access';
import { formatZodErrors, programItemWriteSchema } from '@/lib/events/validation';
import { addProgramItem } from '@/lib/events/program';

type RouteContext = { params: Promise<{ id: string }> };

async function loadEvent(id: string, user: Parameters<typeof eventWhereForUser>[0]) {
  const scoped = eventWhereForUser(user);
  return db.event.findFirst({
    where: scoped ? { AND: [{ id }, scoped] } : { id },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'events', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const event = await loadEvent(id, auth.user);
  if (!event) return notFound('Event');
  if (!canMutateEventRecord(auth.user, event)) return forbidden();

  const parsed = programItemWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const item = await addProgramItem({
    eventId: id,
    ...parsed.data,
    actorId: auth.user.id,
    request,
  });
  return success(item, 'Program item added.', 201);
}
