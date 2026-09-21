import {
  caseStatusLabel,
  followUpStatusLabel,
  noteVisibilityLabel,
  priorityLabel,
  visitLocationLabel,
  visitStatusLabel,
} from './status';

type CategoryRef = { id: string; name: string; slug: string } | null;
type UserNameRef = { id: string; firstName: string; lastName: string } | null;
type MemberRef = {
  id: string;
  membershipNumber: string | null;
  displayName: string | null;
  user?: { firstName: string; lastName: string } | null;
} | null;

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function displayName(user: { firstName: string; lastName: string } | null | undefined) {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`.trim();
}

function memberDisplay(member: MemberRef) {
  if (!member) return null;
  return {
    id: member.id,
    membershipNumber: member.membershipNumber,
    name:
      member.displayName ||
      (member.user ? displayName(member.user) : null) ||
      'Member',
  };
}

export const pastoralCaseListInclude = {
  category: { select: { id: true, name: true, slug: true } },
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
  _count: { select: { notes: true, visits: true, followUps: true } },
} as const;

export const pastoralCaseDetailInclude = {
  ...pastoralCaseListInclude,
  assignments: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
    include: {
      changedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} as const;

export function serializeCase(
  row: {
    id: string;
    memberId: string;
    categoryId: string | null;
    title: string;
    summary: string | null;
    priority: string;
    status: string;
    assignedToId: string | null;
    createdById: string;
    openedAt: Date;
    closedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    category?: CategoryRef;
    assignedTo?: UserNameRef;
    createdBy?: UserNameRef;
    member?: MemberRef;
    _count?: { notes: number; visits: number; followUps: number };
    assignments?: Array<{
      id: string;
      previousAssigneeId: string | null;
      newAssigneeId: string | null;
      reason: string | null;
      createdAt: Date;
      changedBy: UserNameRef;
    }>;
  },
  options?: { includeSummary?: boolean }
) {
  return {
    id: row.id,
    memberId: row.memberId,
    categoryId: row.categoryId,
    title: row.title,
    summary: options?.includeSummary === false ? undefined : row.summary,
    priority: row.priority,
    priorityLabel: priorityLabel(row.priority),
    status: row.status,
    statusLabel: caseStatusLabel(row.status),
    assignedToId: row.assignedToId,
    createdById: row.createdById,
    openedAt: iso(row.openedAt),
    closedAt: iso(row.closedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    category: row.category
      ? { id: row.category.id, name: row.category.name, slug: row.category.slug }
      : null,
    assignedTo: row.assignedTo
      ? { id: row.assignedTo.id, name: displayName(row.assignedTo) }
      : null,
    createdBy: row.createdBy
      ? { id: row.createdBy.id, name: displayName(row.createdBy) }
      : null,
    member: memberDisplay(row.member ?? null),
    counts: row._count
      ? {
          notes: row._count.notes,
          visits: row._count.visits,
          followUps: row._count.followUps,
        }
      : undefined,
    assignments: row.assignments?.map((item) => ({
      id: item.id,
      previousAssigneeId: item.previousAssigneeId,
      newAssigneeId: item.newAssigneeId,
      reason: item.reason,
      createdAt: item.createdAt.toISOString(),
      changedBy: item.changedBy
        ? { id: item.changedBy.id, name: displayName(item.changedBy) }
        : null,
    })),
  };
}

/** Report/list helpers must never include note content. */
export function serializeCaseForReport(row: Parameters<typeof serializeCase>[0]) {
  const base = serializeCase(row, { includeSummary: false });
  const { summary: _summary, ...rest } = base;
  return rest;
}

export function serializeNote(row: {
  id: string;
  caseId: string;
  authorId: string;
  content: string;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
  author?: UserNameRef;
}) {
  return {
    id: row.id,
    caseId: row.caseId,
    authorId: row.authorId,
    content: row.content,
    visibility: row.visibility,
    visibilityLabel: noteVisibilityLabel(row.visibility),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: row.author
      ? { id: row.author.id, name: displayName(row.author) }
      : null,
  };
}

export function serializeVisit(row: {
  id: string;
  memberId: string;
  caseId: string | null;
  assignedToId: string | null;
  createdById: string;
  scheduledAt: Date;
  completedAt: Date | null;
  status: string;
  locationType: string;
  locationNote: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: UserNameRef;
  createdBy?: UserNameRef;
  member?: MemberRef;
}) {
  return {
    id: row.id,
    memberId: row.memberId,
    caseId: row.caseId,
    assignedToId: row.assignedToId,
    createdById: row.createdById,
    scheduledAt: row.scheduledAt.toISOString(),
    completedAt: iso(row.completedAt),
    status: row.status,
    statusLabel: visitStatusLabel(row.status),
    locationType: row.locationType,
    locationLabel: visitLocationLabel(row.locationType),
    locationNote: row.locationNote,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    assignedTo: row.assignedTo
      ? { id: row.assignedTo.id, name: displayName(row.assignedTo) }
      : null,
    createdBy: row.createdBy
      ? { id: row.createdBy.id, name: displayName(row.createdBy) }
      : null,
    member: memberDisplay(row.member ?? null),
  };
}

export function serializeFollowUp(row: {
  id: string;
  caseId: string | null;
  memberId: string | null;
  assignedToId: string | null;
  createdById: string;
  task: string;
  dueDate: Date | null;
  status: string;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: UserNameRef;
  createdBy?: UserNameRef;
}) {
  return {
    id: row.id,
    caseId: row.caseId,
    memberId: row.memberId,
    assignedToId: row.assignedToId,
    createdById: row.createdById,
    task: row.task,
    dueDate: iso(row.dueDate),
    status: row.status,
    statusLabel: followUpStatusLabel(row.status),
    completedAt: iso(row.completedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    assignedTo: row.assignedTo
      ? { id: row.assignedTo.id, name: displayName(row.assignedTo) }
      : null,
    createdBy: row.createdBy
      ? { id: row.createdBy.id, name: displayName(row.createdBy) }
      : null,
  };
}

export function serializeMemberDocument(row: {
  id: string;
  memberId: string;
  uploadedById: string;
  title: string;
  fileUrl: string;
  fileName: string | null;
  fileMime: string | null;
  fileSize: number | null;
  retentionUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  uploadedBy?: UserNameRef;
}) {
  return {
    id: row.id,
    memberId: row.memberId,
    uploadedById: row.uploadedById,
    title: row.title,
    fileName: row.fileName,
    fileMime: row.fileMime,
    fileSize: row.fileSize,
    retentionUntil: iso(row.retentionUntil),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    uploadedBy: row.uploadedBy
      ? { id: row.uploadedBy.id, name: displayName(row.uploadedBy) }
      : null,
    // Never expose raw disk path without auth; clients use signed download route.
    hasFile: Boolean(row.fileUrl),
  };
}

export function serializeProfileChangeRequest(row: {
  id: string;
  memberId: string;
  requestedById: string;
  reviewedById: string | null;
  status: string;
  payload: string;
  staffNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  requestedBy?: UserNameRef;
  reviewedBy?: UserNameRef;
}) {
  let fields: Record<string, unknown> = {};
  try {
    fields = JSON.parse(row.payload) as Record<string, unknown>;
  } catch {
    fields = {};
  }
  return {
    id: row.id,
    memberId: row.memberId,
    requestedById: row.requestedById,
    reviewedById: row.reviewedById,
    status: row.status,
    fields,
    staffNote: row.staffNote,
    reviewedAt: iso(row.reviewedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    requestedBy: row.requestedBy
      ? { id: row.requestedBy.id, name: displayName(row.requestedBy) }
      : null,
    reviewedBy: row.reviewedBy
      ? { id: row.reviewedBy.id, name: displayName(row.reviewedBy) }
      : null,
  };
}
