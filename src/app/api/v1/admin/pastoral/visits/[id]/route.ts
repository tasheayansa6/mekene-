import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canAccessVisit, canManageVisits } from '@/lib/pastoral/access';
import { logPastoralAccess } from '@/lib/pastoral/audit';
import { serializeVisit } from '@/lib/pastoral/serialize';
import { formatZodErrors, pastoralVisitUpdateSchema } from '@/lib/pastoral/validation';
import { sanitizePlainText } from '@/lib/content/sanitize';
import type {
  PastoralVisitLocationValue,
  PastoralVisitStatusValue,
} from '@/lib/pastoral/status';

const visitInclude = {
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  member: {
    select: {
      id: true,
      membershipNumber: true,
      displayName: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  case: { select: { assignedToId: true, createdById: true } },
} as const;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'pastoral', 'update');
  if (!auth.ok) return auth.error;
  if (!canManageVisits(auth.user)) return forbidden();

  const parsed = pastoralVisitUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.pastoralVisit.findUnique({
    where: { id },
    include: { case: { select: { assignedToId: true, createdById: true } } },
  });
  if (!existing) return notFound('Visit');
  if (!canAccessVisit(auth.user, existing)) return notFound('Visit');

  const data: {
    assignedToId?: string | null;
    scheduledAt?: Date;
    completedAt?: Date | null;
    status?: PastoralVisitStatusValue;
    locationType?: PastoralVisitLocationValue;
    locationNote?: string | null;
    notes?: string | null;
  } = {};

  if (parsed.data.assignedToId !== undefined) data.assignedToId = parsed.data.assignedToId;
  if (parsed.data.scheduledAt !== undefined) {
    const date = new Date(parsed.data.scheduledAt);
    if (Number.isNaN(date.getTime())) return validationError({ scheduledAt: ['Invalid date'] });
    data.scheduledAt = date;
  }
  if (parsed.data.completedAt !== undefined) {
    if (parsed.data.completedAt === null) data.completedAt = null;
    else {
      const date = new Date(parsed.data.completedAt);
      if (Number.isNaN(date.getTime())) return validationError({ completedAt: ['Invalid date'] });
      data.completedAt = date;
    }
  }
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
    if (parsed.data.status === 'completed' && data.completedAt === undefined) {
      data.completedAt = new Date();
    }
  }
  if (parsed.data.locationType !== undefined) data.locationType = parsed.data.locationType;
  if (parsed.data.locationNote !== undefined) {
    data.locationNote = parsed.data.locationNote
      ? sanitizePlainText(parsed.data.locationNote, 400)
      : null;
  }
  if (parsed.data.notes !== undefined) {
    data.notes = parsed.data.notes ? sanitizePlainText(parsed.data.notes, 2000) : null;
  }

  const updated = await db.pastoralVisit.update({
    where: { id },
    data,
    include: visitInclude,
  });

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'pastoral_visit',
    resourceId: id,
    action: 'update',
    request,
  });

  return success(serializeVisit(updated), 'Visit updated.');
}
