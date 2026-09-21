import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import {
  canAccessCase,
  canAssignPastoral,
  canUpdatePastoral,
  canViewPastoral,
} from '@/lib/pastoral/access';
import { logPastoralAccess } from '@/lib/pastoral/audit';
import { pastoralCaseDetailInclude, serializeCase } from '@/lib/pastoral/serialize';
import { formatZodErrors, pastoralCaseUpdateSchema } from '@/lib/pastoral/validation';
import { assignCase } from '@/lib/pastoral/write';
import { sanitizeMarkdown, sanitizePlainText } from '@/lib/content/sanitize';
import type { PastoralCaseStatusValue, PastoralPriorityValue } from '@/lib/pastoral/status';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminRead(request, 'pastoral', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewPastoral(auth.user)) return forbidden();

  const { id } = await context.params;
  const row = await db.pastoralCareCase.findUnique({
    where: { id },
    include: pastoralCaseDetailInclude,
  });
  if (!row) return notFound('Pastoral case');
  if (!canAccessCase(auth.user, row)) return notFound('Pastoral case');

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'pastoral_case',
    resourceId: id,
    action: 'view',
    request,
  });

  return success(serializeCase(row));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'pastoral', 'update');
  if (!auth.ok) return auth.error;
  if (!canUpdatePastoral(auth.user)) return forbidden();

  const parsed = pastoralCaseUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { id } = await context.params;
  const existing = await db.pastoralCareCase.findUnique({ where: { id } });
  if (!existing) return notFound('Pastoral case');
  if (!canAccessCase(auth.user, existing)) return notFound('Pastoral case');

  if (parsed.data.assignedToId !== undefined) {
    if (!canAssignPastoral(auth.user)) return forbidden();
    if (parsed.data.assignedToId) {
      const assignee = await db.user.findUnique({
        where: { id: parsed.data.assignedToId },
        select: { id: true },
      });
      if (!assignee) return validationError({ assignedToId: ['Assignee not found'] });
    }
    await assignCase({
      caseId: id,
      newAssigneeId: parsed.data.assignedToId,
      changedById: auth.user.id,
      reason: parsed.data.reason,
      request,
    });
  }

  const data: {
    categoryId?: string | null;
    title?: string;
    summary?: string | null;
    priority?: PastoralPriorityValue;
    status?: PastoralCaseStatusValue;
    closedAt?: Date | null;
  } = {};

  if (parsed.data.categoryId !== undefined) data.categoryId = parsed.data.categoryId;
  if (parsed.data.title !== undefined) data.title = sanitizePlainText(parsed.data.title, 180);
  if (parsed.data.summary !== undefined) {
    data.summary = parsed.data.summary
      ? sanitizeMarkdown(parsed.data.summary, 4000)
      : null;
  }
  if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
    if (parsed.data.status === 'closed' || parsed.data.status === 'resolved') {
      data.closedAt = new Date();
    } else if (existing.closedAt) {
      data.closedAt = null;
    }
  }

  const updated = await db.pastoralCareCase.update({
    where: { id },
    data,
    include: pastoralCaseDetailInclude,
  });

  await logPastoralAccess({
    actorId: auth.user.id,
    resource: 'pastoral_case',
    resourceId: id,
    action: 'update',
    request,
  });

  return success(serializeCase(updated), 'Pastoral case updated.');
}
