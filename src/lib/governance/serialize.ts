type Named = { firstName?: string | null; lastName?: string | null; email?: string | null };

function personName(p?: Named | null) {
  if (!p) return null;
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
  return name || p.email || null;
}

export function serializeAppointment(row: {
  id: string;
  positionId: string;
  memberId: string;
  startAt: Date;
  endAt: Date | null;
  status: string;
  organizationLabel: string | null;
  notes: string | null;
  position?: { id: string; title: string; termMonths: number | null } | null;
  member?: Named & { id: string } | null;
}) {
  return {
    id: row.id,
    positionId: row.positionId,
    positionTitle: row.position?.title ?? null,
    termMonths: row.position?.termMonths ?? null,
    memberId: row.memberId,
    memberName: personName(row.member),
    startAt: row.startAt.toISOString(),
    endAt: row.endAt?.toISOString() ?? null,
    status: row.status,
    organizationLabel: row.organizationLabel,
  };
}

export function serializeCommittee(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  responsibilities: string | null;
  ministryId: string | null;
  chairUserId: string | null;
  secretaryUserId: string | null;
  status: string;
  quorumCount: number | null;
  quorumPercent: number | null;
  termMonths: number | null;
  isActive: boolean;
  _count?: { members?: number; meetings?: number };
}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    responsibilities: row.responsibilities,
    ministryId: row.ministryId,
    chairUserId: row.chairUserId,
    secretaryUserId: row.secretaryUserId,
    status: row.status,
    quorumCount: row.quorumCount,
    quorumPercent: row.quorumPercent,
    termMonths: row.termMonths,
    isActive: row.isActive,
    memberCount: row._count?.members ?? undefined,
    meetingCount: row._count?.meetings ?? undefined,
  };
}

export function serializeMeeting(row: {
  id: string;
  title: string;
  meetingType: string;
  status: string;
  committeeId: string | null;
  ministryId: string | null;
  eventId: string | null;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  onlineUrl: string | null;
  chairUserId: string | null;
  secretaryUserId: string | null;
  agendaLocked: boolean;
  quorumCount: number | null;
  quorumPercent: number | null;
  votingClosed: boolean;
  votingMethod: string | null;
}) {
  return {
    id: row.id,
    title: row.title,
    meetingType: row.meetingType,
    status: row.status,
    committeeId: row.committeeId,
    ministryId: row.ministryId,
    eventId: row.eventId,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    location: row.location,
    onlineUrl: row.onlineUrl,
    chairUserId: row.chairUserId,
    secretaryUserId: row.secretaryUserId,
    agendaLocked: row.agendaLocked,
    quorumCount: row.quorumCount,
    quorumPercent: row.quorumPercent,
    votingClosed: row.votingClosed,
    votingMethod: row.votingMethod,
  };
}

export function serializeRequest(
  row: {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    categoryId: string;
    memberId: string;
    assigneeUserId: string | null;
    assignedMinistryId: string | null;
    assignedCommitteeId: string | null;
    responseDueAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    category?: { name: string; slug: string } | null;
    notes?: Array<{
      id: string;
      body: string;
      isInternal: boolean;
      createdAt: Date;
      authorId: string;
    }>;
  },
  opts?: { includeInternalNotes?: boolean }
) {
  const notes = (row.notes ?? [])
    .filter((n) => opts?.includeInternalNotes || !n.isInternal)
    .map((n) => ({
      id: n.id,
      body: n.body,
      isInternal: n.isInternal,
      createdAt: n.createdAt.toISOString(),
      authorId: n.authorId,
    }));

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    memberId: row.memberId,
    assigneeUserId: row.assigneeUserId,
    assignedMinistryId: row.assignedMinistryId,
    assignedCommitteeId: row.assignedCommitteeId,
    responseDueAt: row.responseDueAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    notes,
  };
}

export function serializePolicy(row: {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  committeeId: string | null;
  requireAck: boolean;
  versions?: Array<{ id: string; version: number; status: string; publishedAt: Date | null }>;
}) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status,
    committeeId: row.committeeId,
    requireAck: row.requireAck,
    versions: (row.versions ?? []).map((v) => ({
      id: v.id,
      version: v.version,
      status: v.status,
      publishedAt: v.publishedAt?.toISOString() ?? null,
    })),
  };
}
