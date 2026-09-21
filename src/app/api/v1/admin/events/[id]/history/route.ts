import { db } from '@/lib/db';
import { forbidden, notFound, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canMutateEventRecord, eventWhereForUser } from '@/lib/events/access';
import { listEventHistory } from '@/lib/events/history';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'events', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const scoped = eventWhereForUser(auth.user);
  const event = await db.event.findFirst({
    where: scoped ? { AND: [{ id }, scoped] } : { id },
  });
  if (!event) return notFound('Event');
  if (!canMutateEventRecord(auth.user, event)) return forbidden();

  const rows = await listEventHistory(id);
  return success(
    rows.map((row) => ({
      id: row.id,
      field: row.field,
      oldValue: row.oldValue,
      newValue: row.newValue,
      createdAt: row.createdAt.toISOString(),
      changedBy: row.changedBy
        ? {
            id: row.changedBy.id,
            email: row.changedBy.email,
            name: [row.changedBy.firstName, row.changedBy.lastName].filter(Boolean).join(' '),
          }
        : null,
    }))
  );
}
