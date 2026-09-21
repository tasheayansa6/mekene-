import { db } from '@/lib/db';
import { serializeMemberPrayer } from '@/lib/prayer/serialize';
import { caseStatusLabel, followUpStatusLabel, visitStatusLabel, visitLocationLabel } from './status';

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

/** Member-facing case row — never includes summary or notes. */
export function serializeMemberCase(row: {
  id: string;
  title: string;
  status: string;
  openedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category?: { name: string } | null;
}) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    statusLabel: caseStatusLabel(row.status),
    openedAt: iso(row.openedAt),
    closedAt: iso(row.closedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    category: row.category ? { name: row.category.name } : null,
  };
}

/** Member-facing visit — omits internal pastoral notes. */
export function serializeMemberVisit(row: {
  id: string;
  scheduledAt: Date;
  completedAt: Date | null;
  status: string;
  locationType: string;
  locationNote: string | null;
  assignedTo?: { id: string; firstName: string; lastName: string } | null;
}) {
  const assignee = row.assignedTo
    ? {
        id: row.assignedTo.id,
        name: `${row.assignedTo.firstName} ${row.assignedTo.lastName}`.trim(),
      }
    : null;
  return {
    id: row.id,
    scheduledAt: row.scheduledAt.toISOString(),
    completedAt: iso(row.completedAt),
    status: row.status,
    statusLabel: visitStatusLabel(row.status),
    locationType: row.locationType,
    locationLabel: visitLocationLabel(row.locationType),
    locationNote: row.locationNote,
    assignedTo: assignee,
  };
}

/** Member-visible follow-up — task only, no case notes. */
export function serializeMemberFollowUp(row: {
  id: string;
  task: string;
  dueDate: Date | null;
  status: string;
  completedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    task: row.task,
    dueDate: iso(row.dueDate),
    status: row.status,
    statusLabel: followUpStatusLabel(row.status),
    completedAt: iso(row.completedAt),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listMemberCareDashboard(userId: string) {
  const member = await db.member.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!member) {
    return {
      prayerRequests: [],
      careCases: [],
      upcomingVisits: [],
      followUps: [],
    };
  }

  const now = new Date();

  const [prayerRequests, careCases, upcomingVisits, followUps] = await Promise.all([
    db.prayerRequest.findMany({
      where: { userId },
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.pastoralCareCase.findMany({
      where: { memberId: member.id },
      select: {
        id: true,
        title: true,
        status: true,
        openedAt: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
    db.pastoralVisit.findMany({
      where: {
        memberId: member.id,
        scheduledAt: { gte: now },
        status: { in: ['scheduled', 'confirmed'] },
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    }),
    db.pastoralFollowUp.findMany({
      where: {
        memberId: member.id,
        status: { in: ['pending', 'in_progress'] },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
  ]);

  return {
    prayerRequests: prayerRequests.map((row) =>
      serializeMemberPrayer(row, { includeContent: false })
    ),
    careCases: careCases.map(serializeMemberCase),
    upcomingVisits: upcomingVisits.map(serializeMemberVisit),
    followUps: followUps.map(serializeMemberFollowUp),
  };
}
