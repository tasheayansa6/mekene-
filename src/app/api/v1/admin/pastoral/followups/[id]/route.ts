import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canAccessFollowUp, canManageFollowUps } from '@/lib/pastoral/access';
import { logPastoralAccess } from '@/lib/pastoral/audit';
import { serializeFollowUp } from '@/lib/pastoral/serialize';
import { formatZodErrors, pastoralFollowUpUpdateSchema } from '@/lib/pastoral/validation';
import { sanitizePlainText } from '@/lib/content/sanitize';
import type { PastoralFollowUpStatusValue } from '@/lib/pastoral/status';

const followUpInclude = {
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  case: { select: { assignedToId: true, createdById: true } },
} as const;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'pastoral', 'update');
  if (!auth.ok) return auth.error;
  if (!canManageFollowUps(auth.user)) return forbidden();

  const parsed = pastoralFollowUpUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.pastoralFollowUp.findUnique({
    where: { id },
    include: { case: { select: { assignedToId: true, createdById: true } } },
  });
  if (!existing) return notFound('Follow-up');
  if (!canAccessFollowUp(auth.user, existing)) return notFound('Follow-up');

  const data: {
    assignedToId?: string | null;
    task?: string;
    dueDate?: Date | null;
    status?: PastoralFollowUpStatusValue;
    completedAt?: Date | null;
  } = {};

  if (parsed.data.assignedToId !== undefined) data.assignedToId = parsed.data.assignedToId;
  if (parsed.data.task !== undefined) data.task = sanitizePlainText(parsed.data.task, 500);
  if (parsed.data.dueDate !== undefined) {
    if (parsed.data.dueDate === null) data.dueDate = null;
    else {
      const date = new Date(parsed.data.dueDate);
      if (Number.isNaN(date.getTime())) return validationError({ dueDate: ['Invalid date'] });
      data.dueDate = date;
    }
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

  const updated = await db.pastoralFollowUp.update({
    where: { id },
    data,
    include: followUpInclude,
  });

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'pastoral_followup',
    resourceId: id,
    action: 'update',
    request,
  });

  return success(serializeFollowUp(updated), 'Follow-up updated.');
}
