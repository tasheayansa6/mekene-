import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canMutateEventRecord, eventWhereForUser } from '@/lib/events/access';
import { formatZodErrors, programMetaSchema } from '@/lib/events/validation';
import { getOrCreateProgram, updateProgramMeta } from '@/lib/events/program';

type RouteContext = { params: Promise<{ id: string }> };

async function loadEvent(id: string, user: Parameters<typeof eventWhereForUser>[0]) {
  const scoped = eventWhereForUser(user);
  return db.event.findFirst({
    where: scoped ? { AND: [{ id }, scoped] } : { id },
  });
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'events', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const event = await loadEvent(id, auth.user);
  if (!event) return notFound('Event');
  if (!canMutateEventRecord(auth.user, event)) return forbidden();

  const program = await getOrCreateProgram(id);
  return success({
    id: program.id,
    title: program.title,
    notes: program.notes,
    isPublic: program.isPublic,
    items: program.items.map((item) => ({
      id: item.id,
      title: item.title,
      itemType: item.itemType,
      description: item.description,
      sortOrder: item.sortOrder,
      durationMinutes: item.durationMinutes,
      responsibleLabel: item.responsibleLabel,
      memberId: item.memberId,
      notes: item.notes,
      status: item.status,
    })),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'events', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const event = await loadEvent(id, auth.user);
  if (!event) return notFound('Event');
  if (!canMutateEventRecord(auth.user, event)) return forbidden();

  const parsed = programMetaSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const program = await updateProgramMeta(id, parsed.data);
  return success(program, 'Program updated.');
}
