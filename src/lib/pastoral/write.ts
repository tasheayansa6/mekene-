import { db } from '@/lib/db';
import { sanitizeMarkdown, sanitizePlainText } from '@/lib/content/sanitize';
import type {
  PastoralCaseStatusValue,
  PastoralFollowUpStatusValue,
  PastoralNoteVisibilityValue,
  PastoralPriorityValue,
  PastoralVisitLocationValue,
  PastoralVisitStatusValue,
} from './status';
import { emitPastoralEvent } from './events';
import { pastoralCaseDetailInclude } from './serialize';

export async function createCase(input: {
  memberId: string;
  categoryId?: string | null;
  title: string;
  summary?: string | null;
  priority?: PastoralPriorityValue;
  status?: PastoralCaseStatusValue;
  assignedToId?: string | null;
  createdById: string;
  request?: Request;
}) {
  let categoryId: string | null = null;
  if (input.categoryId) {
    const category = await db.pastoralCareCategory.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    categoryId = category?.id ?? null;
  }

  const assignedToId = input.assignedToId || null;
  const row = await db.pastoralCareCase.create({
    data: {
      memberId: input.memberId,
      categoryId,
      title: sanitizePlainText(input.title, 180),
      summary: input.summary ? sanitizeMarkdown(input.summary, 4000) : null,
      priority: input.priority || 'normal',
      status: input.status || 'open',
      assignedToId,
      createdById: input.createdById,
      ...(assignedToId
        ? {
            assignments: {
              create: {
                previousAssigneeId: null,
                newAssigneeId: assignedToId,
                changedById: input.createdById,
                reason: 'Initial assignment',
              },
            },
          }
        : {}),
    },
    include: pastoralCaseDetailInclude,
  });

  if (assignedToId && assignedToId !== input.createdById) {
    await emitPastoralEvent({
      type: 'case_assigned',
      actorId: input.createdById,
      entityId: row.id,
      recipientUserId: assignedToId,
      request: input.request,
    });
  }

  return row;
}

export async function assignCase(input: {
  caseId: string;
  newAssigneeId: string | null;
  changedById: string;
  reason?: string | null;
  request?: Request;
}) {
  const existing = await db.pastoralCareCase.findUnique({
    where: { id: input.caseId },
    select: { id: true, assignedToId: true },
  });
  if (!existing) return null;

  const previousAssigneeId = existing.assignedToId;
  if (previousAssigneeId === input.newAssigneeId) {
    return db.pastoralCareCase.findUnique({
      where: { id: input.caseId },
      include: pastoralCaseDetailInclude,
    });
  }

  await db.pastoralAssignmentHistory.create({
    data: {
      caseId: input.caseId,
      previousAssigneeId,
      newAssigneeId: input.newAssigneeId,
      changedById: input.changedById,
      reason: input.reason ? sanitizePlainText(input.reason, 400) : null,
    },
  });

  const updated = await db.pastoralCareCase.update({
    where: { id: input.caseId },
    data: { assignedToId: input.newAssigneeId },
    include: pastoralCaseDetailInclude,
  });

  if (input.newAssigneeId && input.newAssigneeId !== input.changedById) {
    await emitPastoralEvent({
      type: 'case_assigned',
      actorId: input.changedById,
      entityId: input.caseId,
      recipientUserId: input.newAssigneeId,
      request: input.request,
    });
  }

  return updated;
}

export async function addNote(input: {
  caseId: string;
  authorId: string;
  content: string;
  visibility?: PastoralNoteVisibilityValue;
}) {
  return db.pastoralCareNote.create({
    data: {
      caseId: input.caseId,
      authorId: input.authorId,
      content: sanitizeMarkdown(input.content, 8000),
      visibility: input.visibility || 'case_team',
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function createVisit(input: {
  memberId: string;
  caseId?: string | null;
  assignedToId?: string | null;
  createdById: string;
  scheduledAt: Date;
  status?: PastoralVisitStatusValue;
  locationType?: PastoralVisitLocationValue;
  locationNote?: string | null;
  notes?: string | null;
  request?: Request;
}) {
  const row = await db.pastoralVisit.create({
    data: {
      memberId: input.memberId,
      caseId: input.caseId || null,
      assignedToId: input.assignedToId || null,
      createdById: input.createdById,
      scheduledAt: input.scheduledAt,
      status: input.status || 'scheduled',
      locationType: input.locationType || 'church',
      locationNote: input.locationNote
        ? sanitizePlainText(input.locationNote, 400)
        : null,
      notes: input.notes ? sanitizePlainText(input.notes, 2000) : null,
    },
    include: {
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
    },
  });

  if (row.assignedToId && row.assignedToId !== input.createdById) {
    await emitPastoralEvent({
      type: 'visit_scheduled',
      actorId: input.createdById,
      entityId: row.id,
      recipientUserId: row.assignedToId,
      request: input.request,
    });
  }

  return row;
}

export async function createFollowUp(input: {
  caseId?: string | null;
  memberId?: string | null;
  assignedToId?: string | null;
  createdById: string;
  task: string;
  dueDate?: Date | null;
  status?: PastoralFollowUpStatusValue;
  request?: Request;
}) {
  const row = await db.pastoralFollowUp.create({
    data: {
      caseId: input.caseId || null,
      memberId: input.memberId || null,
      assignedToId: input.assignedToId || null,
      createdById: input.createdById,
      task: sanitizePlainText(input.task, 500),
      dueDate: input.dueDate || null,
      status: input.status || 'pending',
    },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (row.assignedToId && row.assignedToId !== input.createdById) {
    await emitPastoralEvent({
      type: 'followup_due',
      actorId: input.createdById,
      entityId: row.id,
      recipientUserId: row.assignedToId,
      request: input.request,
    });
  }

  return row;
}
