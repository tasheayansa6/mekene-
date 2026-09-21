import {
  methodLabel,
  recordStatusLabel,
  sessionStatusLabel,
  sessionTypeLabel,
} from './status';

export const sessionAdminInclude = {
  event: { select: { id: true, title: true, slug: true } },
  ministry: { select: { id: true, name: true, slug: true, leaderUserId: true } },
  location: { select: { id: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { records: true } },
} as const;

export const sessionDetailInclude = {
  ...sessionAdminInclude,
  records: {
    orderBy: { checkInAt: 'desc' as const },
    take: 200,
    include: {
      member: {
        select: {
          id: true,
          membershipNumber: true,
          displayName: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      recordedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} as const;

export const recordAdminInclude = {
  session: {
    select: {
      id: true,
      title: true,
      sessionType: true,
      startsAt: true,
      status: true,
      timezone: true,
    },
  },
  member: {
    select: {
      id: true,
      membershipNumber: true,
      displayName: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  recordedBy: { select: { id: true, firstName: true, lastName: true } },
  corrections: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
    include: {
      changedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} as const;

function memberDisplay(member: {
  displayName: string | null;
  user: { firstName: string; lastName: string };
}) {
  if (member.displayName?.trim()) return member.displayName.trim();
  return `${member.user.firstName} ${member.user.lastName}`.trim();
}

export function serializeSessionList(row: {
  id: string;
  title: string;
  sessionType: string;
  status: string;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  locationNote: string | null;
  allowSelfCheckIn: boolean;
  allowQrCheckIn: boolean;
  event?: { id: string; title: string; slug: string } | null;
  ministry?: { id: string; name: string; slug: string } | null;
  location?: { id: string; name: string } | null;
  _count?: { records: number };
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    title: row.title,
    sessionType: row.sessionType,
    sessionTypeLabel: sessionTypeLabel(row.sessionType),
    status: row.status,
    statusLabel: sessionStatusLabel(row.status),
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    timezone: row.timezone,
    locationNote: row.locationNote,
    allowSelfCheckIn: row.allowSelfCheckIn,
    allowQrCheckIn: row.allowQrCheckIn,
    event: row.event ?? null,
    ministry: row.ministry ?? null,
    location: row.location ?? null,
    recordCount: row._count?.records ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeSessionDetail(row: {
  id: string;
  title: string;
  sessionType: string;
  status: string;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  locationNote: string | null;
  notes: string | null;
  allowSelfCheckIn: boolean;
  allowQrCheckIn: boolean;
  openedAt: Date | null;
  closedAt: Date | null;
  event?: { id: string; title: string; slug: string } | null;
  ministry?: { id: string; name: string; slug: string } | null;
  location?: { id: string; name: string } | null;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  records?: Array<{
    id: string;
    status: string;
    method: string;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    notes: string | null;
    member: {
      id: string;
      membershipNumber: string | null;
      displayName: string | null;
      user: { firstName: string; lastName: string };
    };
    recordedBy?: { id: string; firstName: string; lastName: string } | null;
  }>;
  _count?: { records: number };
  createdAt: Date;
  updatedAt: Date;
}) {
  const present = (row.records || []).filter((r) =>
    r.status === 'present' || r.status === 'late'
  ).length;
  return {
    ...serializeSessionList(row),
    notes: row.notes,
    openedAt: row.openedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    createdBy: row.createdBy
      ? {
          id: row.createdBy.id,
          name: `${row.createdBy.firstName} ${row.createdBy.lastName}`.trim(),
        }
      : null,
    presentCount: present,
    records: (row.records || []).map((record) => ({
      id: record.id,
      status: record.status,
      statusLabel: recordStatusLabel(record.status),
      method: record.method,
      methodLabel: methodLabel(record.method),
      checkInAt: record.checkInAt?.toISOString() ?? null,
      checkOutAt: record.checkOutAt?.toISOString() ?? null,
      notes: record.notes,
      member: {
        id: record.member.id,
        membershipNumber: record.member.membershipNumber,
        name: memberDisplay(record.member),
      },
      recordedBy: record.recordedBy
        ? {
            id: record.recordedBy.id,
            name: `${record.recordedBy.firstName} ${record.recordedBy.lastName}`.trim(),
          }
        : null,
    })),
  };
}

export function serializeActiveSession(row: {
  id: string;
  title: string;
  sessionType: string;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  locationNote: string | null;
  location?: { id: string; name: string } | null;
  ministry?: { id: string; name: string; slug: string } | null;
  event?: { id: string; title: string; slug: string } | null;
}) {
  return {
    id: row.id,
    title: row.title,
    sessionType: row.sessionType,
    sessionTypeLabel: sessionTypeLabel(row.sessionType),
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    timezone: row.timezone,
    locationNote: row.locationNote,
    location: row.location ?? null,
    ministry: row.ministry ?? null,
    event: row.event ?? null,
  };
}

export function serializeRecordSelf(row: {
  id: string;
  status: string;
  method: string;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  session: {
    id: string;
    title: string;
    sessionType: string;
    startsAt: Date;
    timezone: string;
  };
}) {
  return {
    id: row.id,
    status: row.status,
    statusLabel: recordStatusLabel(row.status),
    method: row.method,
    methodLabel: methodLabel(row.method),
    checkInAt: row.checkInAt?.toISOString() ?? null,
    checkOutAt: row.checkOutAt?.toISOString() ?? null,
    session: {
      id: row.session.id,
      title: row.session.title,
      sessionType: row.session.sessionType,
      sessionTypeLabel: sessionTypeLabel(row.session.sessionType),
      startsAt: row.session.startsAt.toISOString(),
      timezone: row.session.timezone,
    },
  };
}

export function serializeRecordAdmin(row: {
  id: string;
  status: string;
  method: string;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  session: {
    id: string;
    title: string;
    sessionType: string;
    startsAt: Date;
    status: string;
    timezone: string;
  };
  member: {
    id: string;
    membershipNumber: string | null;
    displayName: string | null;
    user: { firstName: string; lastName: string };
  };
  recordedBy?: { id: string; firstName: string; lastName: string } | null;
  corrections?: Array<{
    id: string;
    oldValue: string;
    newValue: string;
    reason: string;
    createdAt: Date;
    changedBy?: { id: string; firstName: string; lastName: string } | null;
  }>;
}) {
  return {
    id: row.id,
    status: row.status,
    statusLabel: recordStatusLabel(row.status),
    method: row.method,
    methodLabel: methodLabel(row.method),
    checkInAt: row.checkInAt?.toISOString() ?? null,
    checkOutAt: row.checkOutAt?.toISOString() ?? null,
    notes: row.notes,
    session: {
      id: row.session.id,
      title: row.session.title,
      sessionType: row.session.sessionType,
      sessionTypeLabel: sessionTypeLabel(row.session.sessionType),
      startsAt: row.session.startsAt.toISOString(),
      status: row.session.status,
      timezone: row.session.timezone,
    },
    member: {
      id: row.member.id,
      membershipNumber: row.member.membershipNumber,
      name: memberDisplay(row.member),
    },
    recordedBy: row.recordedBy
      ? {
          id: row.recordedBy.id,
          name: `${row.recordedBy.firstName} ${row.recordedBy.lastName}`.trim(),
        }
      : null,
    corrections: (row.corrections || []).map((item) => ({
      id: item.id,
      oldValue: item.oldValue,
      newValue: item.newValue,
      reason: item.reason,
      createdAt: item.createdAt.toISOString(),
      changedBy: item.changedBy
        ? {
            id: item.changedBy.id,
            name: `${item.changedBy.firstName} ${item.changedBy.lastName}`.trim(),
          }
        : null,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
