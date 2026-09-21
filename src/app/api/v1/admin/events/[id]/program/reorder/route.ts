import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canMutateEventRecord, eventWhereForUser } from '@/lib/events/access';
import { formatZodErrors, programReorderSchema } from '@/lib/events/validation';
import { reorderProgramItems } from '@/lib/events/program';

type RouteContext = { params: Promise<{ id: string }> };

async function loadEvent(id: string, user: Parameters<typeof eventWhereForUser>[0]) {
  const scoped = eventWhereForUser(user);
  return db.event.findFirst({
    where: scoped ? { AND: [{ id }, scoped] } : { id },
    include: { serviceProgram: true },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'events', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const event = await loadEvent(id, auth.user);
  if (!event) return notFound('Event');
  if (!canMutateEventRecord(auth.user, event)) return forbidden();
  if (!event.serviceProgram) return notFound('Program');

  const parsed = programReorderSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  try {
    const items = await reorderProgramItems(event.serviceProgram.id, parsed.data.orderedIds);
    return success(items, 'Program order saved.');
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Unable to reorder program.', 409);
  }
}
