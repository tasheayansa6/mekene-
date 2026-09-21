import {
  applicationStatusLabel,
  assignmentStatusLabel,
  attendanceStatusLabel,
  enrollmentStatusLabel,
  staffStatusLabel,
  volunteerStatusLabel,
} from './status';

type UserNameRef = { id: string; firstName: string; lastName: string } | null;
type MemberRef = {
  id: string;
  membershipNumber: string | null;
  displayName: string | null;
  userId?: string;
  user?: { id?: string; firstName: string; lastName: string; email?: string } | null;
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

export const staffListInclude = {
  user: {
    select: { id: true, firstName: true, lastName: true, email: true, profileImage: true },
  },
  member: {
    select: {
      id: true,
      membershipNumber: true,
      displayName: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  department: { select: { id: true, name: true, slug: true } },
  position: { select: { id: true, name: true, slug: true } },
  supervisor: { select: { id: true, firstName: true, lastName: true } },
} as const;

export const volunteerProfileInclude = {
  member: {
    select: {
      id: true,
      membershipNumber: true,
      displayName: true,
      userId: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
} as const;

export const applicationAdminInclude = {
  member: {
    select: {
      id: true,
      membershipNumber: true,
      displayName: true,
      userId: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
  ministry: { select: { id: true, name: true, slug: true, leaderUserId: true } },
  reviewedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

export const assignmentInclude = {
  member: {
    select: {
      id: true,
      membershipNumber: true,
      displayName: true,
      userId: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  event: { select: { id: true, title: true, slug: true, startAt: true, endAt: true } },
  ministry: { select: { id: true, name: true, slug: true, leaderUserId: true } },
  team: {
    select: {
      id: true,
      name: true,
      slug: true,
      leaderUserId: true,
      assistantLeaderUserId: true,
    },
  },
  volunteerRole: { select: { id: true, name: true, slug: true, slotsRequired: true } },
} as const;

export const teamInclude = {
  ministry: { select: { id: true, name: true, slug: true, leaderUserId: true } },
  leaderUser: { select: { id: true, firstName: true, lastName: true } },
  assistantLeaderUser: { select: { id: true, firstName: true, lastName: true } },
  department: { select: { id: true, name: true, slug: true } },
  _count: { select: { members: true } },
} as const;

export function serializeStaff(row: {
  id: string;
  staffNumber: string | null;
  userId: string;
  memberId: string | null;
  departmentId: string | null;
  positionId: string | null;
  supervisorId: string | null;
  status: string;
  startDate: Date | null;
  workEmail: string | null;
  workPhone: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string | null;
  };
  member?: MemberRef;
  department?: { id: string; name: string; slug: string } | null;
  position?: { id: string; name: string; slug: string } | null;
  supervisor?: UserNameRef;
}) {
  return {
    id: row.id,
    staffNumber: row.staffNumber,
    userId: row.userId,
    memberId: row.memberId,
    departmentId: row.departmentId,
    positionId: row.positionId,
    supervisorId: row.supervisorId,
    status: row.status,
    statusLabel: staffStatusLabel(row.status),
    startDate: iso(row.startDate),
    workEmail: row.workEmail,
    workPhone: row.workPhone,
    notes: row.notes,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    user: row.user
      ? {
          id: row.user.id,
          name: displayName(row.user),
          email: row.user.email,
          profileImage: row.user.profileImage ?? null,
        }
      : null,
    member: memberDisplay(row.member ?? null),
    department: row.department ?? null,
    position: row.position ?? null,
    supervisor: row.supervisor
      ? { id: row.supervisor.id, name: displayName(row.supervisor) }
      : null,
  };
}

export function serializeVolunteerProfile(row: {
  id: string;
  memberId: string;
  status: string;
  joinedAt: Date | null;
  experience: string | null;
  createdAt: Date;
  updatedAt: Date;
  maxFrequencyPerMonth?: number | null;
  preferredServiceTypes?: string | null;
  member?: MemberRef;
}) {
  return {
    id: row.id,
    memberId: row.memberId,
    status: row.status,
    statusLabel: volunteerStatusLabel(row.status),
    joinedAt: iso(row.joinedAt),
    experience: row.experience,
    maxFrequencyPerMonth: row.maxFrequencyPerMonth ?? null,
    preferredServiceTypes: row.preferredServiceTypes ?? null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    member: memberDisplay(row.member ?? null),
  };
}

/**
 * Admin serializer may include reviewNotes.
 * Member serializer never exposes reviewNotes.
 */
export function serializeApplication(
  row: {
    id: string;
    memberId: string;
    ministryId: string | null;
    status: string;
    preferredMinistry: string | null;
    skills: string | null;
    experience: string | null;
    availability: string | null;
    motivation: string | null;
    preferredTimes: string | null;
    reviewerMessage: string | null;
    reviewNotes: string | null;
    reviewedById: string | null;
    reviewedAt: Date | null;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    member?: MemberRef;
    ministry?: { id: string; name: string; slug: string; leaderUserId?: string | null } | null;
    reviewedBy?: UserNameRef;
  },
  options?: { includeReviewNotes?: boolean }
) {
  const base: Record<string, unknown> = {
    id: row.id,
    memberId: row.memberId,
    ministryId: row.ministryId,
    status: row.status,
    statusLabel: applicationStatusLabel(row.status),
    preferredMinistry: row.preferredMinistry,
    skills: row.skills,
    experience: row.experience,
    availability: row.availability,
    motivation: row.motivation,
    preferredTimes: row.preferredTimes,
    reviewerMessage: row.reviewerMessage,
    reviewedById: row.reviewedById,
    reviewedAt: iso(row.reviewedAt),
    submittedAt: iso(row.submittedAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    member: memberDisplay(row.member ?? null),
    ministry: row.ministry
      ? { id: row.ministry.id, name: row.ministry.name, slug: row.ministry.slug }
      : null,
    reviewedBy: row.reviewedBy
      ? { id: row.reviewedBy.id, name: displayName(row.reviewedBy) }
      : null,
  };

  if (options?.includeReviewNotes) {
    base.reviewNotes = row.reviewNotes;
  }
  return base;
}

/** Member-facing application view — never includes reviewNotes. */
export function serializeApplicationForMember(
  row: Parameters<typeof serializeApplication>[0]
) {
  const serialized = serializeApplication(row, { includeReviewNotes: false });
  return serialized;
}

export function serializeAssignment(row: {
  id: string;
  eventId: string;
  memberId: string;
  ministryId: string | null;
  teamId: string | null;
  roleId?: string | null;
  roleName: string;
  scheduledAt: Date;
  endsAt: Date | null;
  status: string;
  declineReason: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  attendanceStatus?: string | null;
  checkInAt?: Date | null;
  checkOutAt?: Date | null;
  hoursMinutes?: number | null;
  member?: MemberRef;
  event?: {
    id: string;
    title: string;
    slug: string;
    startAt: Date;
    endAt: Date;
  } | null;
  ministry?: { id: string; name: string; slug: string } | null;
  team?: { id: string; name: string; slug: string } | null;
  volunteerRole?: { id: string; name: string; slug: string; slotsRequired: number } | null;
  hasConflictWarning?: boolean;
  checkInToken?: string | null;
}) {
  return {
    id: row.id,
    eventId: row.eventId,
    memberId: row.memberId,
    ministryId: row.ministryId,
    teamId: row.teamId,
    roleId: row.roleId ?? null,
    roleName: row.roleName,
    scheduledAt: iso(row.scheduledAt),
    endsAt: iso(row.endsAt),
    status: row.status,
    statusLabel: assignmentStatusLabel(row.status),
    declineReason: row.declineReason,
    attendanceStatus: row.attendanceStatus ?? null,
    attendanceStatusLabel: row.attendanceStatus
      ? attendanceStatusLabel(row.attendanceStatus)
      : null,
    checkInAt: iso(row.checkInAt),
    checkOutAt: iso(row.checkOutAt),
    hoursMinutes: row.hoursMinutes ?? null,
    createdById: row.createdById,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    member: memberDisplay(row.member ?? null),
    event: row.event
      ? {
          id: row.event.id,
          title: row.event.title,
          slug: row.event.slug,
          startAt: iso(row.event.startAt),
          endAt: iso(row.event.endAt),
        }
      : null,
    ministry: row.ministry ?? null,
    team: row.team ?? null,
    volunteerRole: row.volunteerRole ?? null,
    hasConflictWarning: row.hasConflictWarning ?? false,
    ...(row.checkInToken ? { checkInToken: row.checkInToken } : {}),
  };
}

export function serializeTeam(row: {
  id: string;
  ministryId: string;
  name: string;
  slug: string;
  description: string | null;
  leaderUserId: string | null;
  assistantLeaderUserId?: string | null;
  departmentId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  ministry?: { id: string; name: string; slug: string } | null;
  leaderUser?: UserNameRef;
  assistantLeaderUser?: UserNameRef;
  department?: { id: string; name: string; slug: string } | null;
  _count?: { members: number };
}) {
  return {
    id: row.id,
    ministryId: row.ministryId,
    departmentId: row.departmentId ?? null,
    name: row.name,
    slug: row.slug,
    description: row.description,
    leaderUserId: row.leaderUserId,
    assistantLeaderUserId: row.assistantLeaderUserId ?? null,
    isActive: row.isActive,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    ministry: row.ministry ?? null,
    department: row.department ?? null,
    leaderUser: row.leaderUser
      ? { id: row.leaderUser.id, name: displayName(row.leaderUser) }
      : null,
    assistantLeaderUser: row.assistantLeaderUser
      ? { id: row.assistantLeaderUser.id, name: displayName(row.assistantLeaderUser) }
      : null,
    memberCount: row._count?.members ?? 0,
  };
}

export function serializeTrainingProgram(row: {
  id: string;
  ministryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  ministry?: { id: string; name: string; slug: string } | null;
  _count?: { sessions: number };
}) {
  return {
    id: row.id,
    ministryId: row.ministryId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isActive: row.isActive,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    ministry: row.ministry ?? null,
    sessionCount: row._count?.sessions ?? 0,
  };
}

export function serializeTrainingSession(row: {
  id: string;
  programId: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  capacity: number | null;
  instructorId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  program?: { id: string; name: string; slug: string } | null;
  instructor?: UserNameRef;
  _count?: { enrollments: number; waitlist: number };
}) {
  return {
    id: row.id,
    programId: row.programId,
    title: row.title,
    startsAt: iso(row.startsAt),
    endsAt: iso(row.endsAt),
    location: row.location,
    capacity: row.capacity,
    instructorId: row.instructorId,
    status: row.status,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    program: row.program ?? null,
    instructor: row.instructor
      ? { id: row.instructor.id, name: displayName(row.instructor) }
      : null,
    enrolledCount: row._count?.enrollments ?? 0,
    waitlistCount: row._count?.waitlist ?? 0,
  };
}

export function serializeEnrollment(row: {
  id: string;
  sessionId: string;
  memberId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    sessionId: row.sessionId,
    memberId: row.memberId,
    status: row.status,
    statusLabel: enrollmentStatusLabel(row.status),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeAvailability(row: {
  id: string;
  memberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    memberId: row.memberId,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    isAvailable: row.isAvailable,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeVolunteerRole(row: {
  id: string;
  ministryId: string | null;
  teamId: string | null;
  name: string;
  slug: string;
  description: string | null;
  requiredSkillId: string | null;
  requiredProgramId: string | null;
  slotsRequired: number;
  requireTeamMembership: boolean;
  isActive: boolean;
  sortOrder: number;
}) {
  return {
    id: row.id,
    ministryId: row.ministryId,
    teamId: row.teamId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    requiredSkillId: row.requiredSkillId,
    requiredProgramId: row.requiredProgramId,
    slotsRequired: row.slotsRequired,
    requireTeamMembership: row.requireTeamMembership,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export function serializeVolunteerRequest(row: {
  id: string;
  memberId: string;
  type: string;
  status: string;
  ministryId: string | null;
  teamId: string | null;
  assignmentId: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    memberId: row.memberId,
    type: row.type,
    status: row.status,
    ministryId: row.ministryId,
    teamId: row.teamId,
    assignmentId: row.assignmentId,
    note: row.note,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}
