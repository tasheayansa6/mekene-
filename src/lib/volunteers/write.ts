import { db } from '@/lib/db';
import { sanitizePlainText } from '@/lib/content/sanitize';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import {
  assignmentWindow,
  detectOverlappingAssignments,
} from './conflicts';
import { emitVolunteerEvent } from './events';
import {
  eligibilityMessage,
  gatherEligibilityFacts,
  evaluateEligibility,
  type EligibilityReason,
} from './eligibility';
import { assertNonNegativeHours, computeHoursMinutes } from './hours';
import { scheduleAssignmentReminders } from './reminders';
import {
  ACTIVE_ASSIGNMENT_STATUSES,
  SEATED_ENROLLMENT_STATUSES,
  type ServiceAssignmentStatusValue,
} from './status';
import {
  applicationAdminInclude,
  assignmentInclude,
  serializeAssignment,
} from './serialize';

export class VolunteerWriteError extends Error {
  constructor(
    public code: 'not_found' | 'conflict' | 'invalid' | 'full' | 'unauthorized' | 'ineligible',
    message: string
  ) {
    super(message);
  }
}

/**
 * Pure helper for training capacity decisions (also used in unit tests).
 */
export function resolveEnrollmentCapacity(input: {
  capacity: number | null;
  seatedCount: number;
}): 'enroll' | 'waitlist' {
  if (input.capacity == null) return 'enroll';
  if (input.seatedCount >= input.capacity) return 'waitlist';
  return 'enroll';
}

export async function approveApplication(input: {
  applicationId: string;
  reviewerId: string;
  reviewNotes?: string | null;
  reviewerMessage?: string | null;
  addToMinistry?: boolean;
  request?: Request;
}) {
  const existing = await db.volunteerApplication.findUnique({
    where: { id: input.applicationId },
    include: {
      member: { select: { id: true, userId: true } },
    },
  });
  if (!existing) return null;

  const result = await db.$transaction(async (tx) => {
    const application = await tx.volunteerApplication.update({
      where: { id: existing.id },
      data: {
        status: 'approved',
        reviewedById: input.reviewerId,
        reviewedAt: new Date(),
        reviewNotes: input.reviewNotes
          ? sanitizePlainText(input.reviewNotes, 2000)
          : existing.reviewNotes,
        reviewerMessage: input.reviewerMessage
          ? sanitizePlainText(input.reviewerMessage, 1000)
          : existing.reviewerMessage,
      },
      include: applicationAdminInclude,
    });

    const priorProfile = await tx.volunteerProfile.findUnique({
      where: { memberId: existing.memberId },
      select: { joinedAt: true },
    });

    const profile = await tx.volunteerProfile.upsert({
      where: { memberId: existing.memberId },
      create: {
        memberId: existing.memberId,
        status: 'approved',
        joinedAt: new Date(),
        experience: existing.experience,
      },
      update: {
        status: 'approved',
        ...(priorProfile?.joinedAt ? {} : { joinedAt: new Date() }),
        experience: existing.experience ?? undefined,
      },
    });

    let ministryLink: {
      id: string;
      memberId: string;
      ministryId: string;
      status: string;
      roleLabel: string | null;
      joinedAt: Date | null;
    } | null = null;
    const shouldLink = input.addToMinistry !== false && existing.ministryId;
    if (shouldLink && existing.ministryId) {
      ministryLink = await tx.memberMinistry.upsert({
        where: {
          memberId_ministryId: {
            memberId: existing.memberId,
            ministryId: existing.ministryId,
          },
        },
        create: {
          memberId: existing.memberId,
          ministryId: existing.ministryId,
          status: 'active',
          roleLabel: 'Volunteer',
          joinedAt: new Date(),
        },
        update: {
          status: 'active',
          joinedAt: new Date(),
        },
      });
    }

    return { application, profile, ministryLink };
  });

  await startOnboardingForMember({
    memberId: existing.memberId,
    ministryId: existing.ministryId,
  });

  await emitVolunteerEvent({
    type: 'application_reviewed',
    actorId: input.reviewerId,
    entityId: existing.id,
    recipientUserId: existing.member.userId,
    request: input.request,
  });

  return result;
}

export async function rejectApplication(input: {
  applicationId: string;
  reviewerId: string;
  reviewNotes?: string | null;
  reviewerMessage?: string | null;
  request?: Request;
}) {
  const existing = await db.volunteerApplication.findUnique({
    where: { id: input.applicationId },
    include: { member: { select: { userId: true } } },
  });
  if (!existing) return null;

  const application = await db.volunteerApplication.update({
    where: { id: existing.id },
    data: {
      status: 'rejected',
      reviewedById: input.reviewerId,
      reviewedAt: new Date(),
      reviewNotes: input.reviewNotes
        ? sanitizePlainText(input.reviewNotes, 2000)
        : existing.reviewNotes,
      reviewerMessage: input.reviewerMessage
        ? sanitizePlainText(input.reviewerMessage, 1000)
        : existing.reviewerMessage,
    },
    include: applicationAdminInclude,
  });

  await emitVolunteerEvent({
    type: 'application_reviewed',
    actorId: input.reviewerId,
    entityId: existing.id,
    recipientUserId: existing.member.userId,
    request: input.request,
  });

  return application;
}

export async function requestApplicationInfo(input: {
  applicationId: string;
  reviewerId: string;
  reviewNotes?: string | null;
  reviewerMessage?: string | null;
  request?: Request;
}) {
  const existing = await db.volunteerApplication.findUnique({
    where: { id: input.applicationId },
    include: { member: { select: { userId: true } } },
  });
  if (!existing) return null;

  const application = await db.volunteerApplication.update({
    where: { id: existing.id },
    data: {
      status: 'more_info',
      reviewedById: input.reviewerId,
      reviewedAt: new Date(),
      reviewNotes: input.reviewNotes
        ? sanitizePlainText(input.reviewNotes, 2000)
        : existing.reviewNotes,
      reviewerMessage: input.reviewerMessage
        ? sanitizePlainText(input.reviewerMessage, 1000)
        : existing.reviewerMessage,
    },
    include: applicationAdminInclude,
  });

  await emitVolunteerEvent({
    type: 'application_reviewed',
    actorId: input.reviewerId,
    entityId: existing.id,
    recipientUserId: existing.member.userId,
    request: input.request,
  });

  return application;
}

/**
 * Create a service assignment with server-side conflict detection.
 * When overlaps exist and allowConflicts is false, throws VolunteerWriteError('conflict').
 * When allowConflicts is true, creates and returns hasConflictWarning: true.
 */
export async function createAssignment(input: {
  eventId: string;
  memberId: string;
  ministryId?: string | null;
  teamId?: string | null;
  roleId?: string | null;
  roleName: string;
  scheduledAt: Date;
  endsAt?: Date | null;
  status?: ServiceAssignmentStatusValue;
  createdById: string;
  allowConflicts?: boolean;
  reminderOffsetsMinutes?: number[];
  request?: Request;
}) {
  const facts = await gatherEligibilityFacts({
    memberId: input.memberId,
    ministryId: input.ministryId,
    teamId: input.teamId,
    roleId: input.roleId,
    eventId: input.eventId,
    roleName: input.roleName,
    scheduledAt: input.scheduledAt,
    endsAt: input.endsAt,
  });
  const eligibility = evaluateEligibility(facts);
  const skippable: EligibilityReason[] = ['schedule_conflict'];
  const blocking = eligibility.reasons.filter(
    (reason) => !(input.allowConflicts && skippable.includes(reason))
  );
  if (blocking.length > 0) {
    throw new VolunteerWriteError(
      blocking.includes('schedule_conflict') || blocking.includes('duplicate_assignment')
        ? 'conflict'
        : 'ineligible',
      eligibilityMessage(blocking)
    );
  }

  const window = assignmentWindow(input.scheduledAt, input.endsAt ?? null);
  const overlaps = await detectOverlappingAssignments(
    input.memberId,
    window.start,
    window.end
  );

  const token = generateToken(16);
  const row = await db.serviceAssignment.create({
    data: {
      eventId: input.eventId,
      memberId: input.memberId,
      ministryId: input.ministryId || null,
      teamId: input.teamId || null,
      roleId: input.roleId || null,
      roleName: sanitizePlainText(input.roleName, 120),
      scheduledAt: input.scheduledAt,
      endsAt: input.endsAt || null,
      status: input.status || 'proposed',
      createdById: input.createdById,
      checkInTokenHash: hashToken(token),
    },
    include: assignmentInclude,
  });

  const member = await db.member.findUnique({
    where: { id: input.memberId },
    select: { userId: true },
  });

  await emitVolunteerEvent({
    type: 'assignment_proposed',
    actorId: input.createdById,
    entityId: row.id,
    recipientUserId: member?.userId,
    request: input.request,
  });

  if (member?.userId) {
    await scheduleAssignmentReminders({
      assignmentId: row.id,
      userId: member.userId,
      scheduledAt: input.scheduledAt,
      createdById: input.createdById,
      offsetsMinutes: input.reminderOffsetsMinutes,
    });
  }

  return {
    assignment: serializeAssignment({
      ...row,
      hasConflictWarning: overlaps.length > 0,
      checkInToken: token,
    }),
    conflicts: overlaps,
    hasConflictWarning: overlaps.length > 0,
    eligibility,
  };
}

export async function confirmAssignment(input: {
  assignmentId: string;
  memberId: string;
  request?: Request;
}) {
  const existing = await db.serviceAssignment.findUnique({
    where: { id: input.assignmentId },
    include: assignmentInclude,
  });
  if (!existing || existing.memberId !== input.memberId) return null;
  if (!ACTIVE_ASSIGNMENT_STATUSES.includes(existing.status as ServiceAssignmentStatusValue)) {
    if (existing.status === 'confirmed') {
      return serializeAssignment(existing);
    }
  }

  const updated = await db.serviceAssignment.update({
    where: { id: existing.id },
    data: { status: 'confirmed', declineReason: null },
    include: assignmentInclude,
  });

  await emitVolunteerEvent({
    type: 'assignment_confirmed',
    actorId: existing.member?.userId ?? null,
    entityId: updated.id,
    recipientUserId: existing.createdById,
    request: input.request,
    relatedUrl: '/admin/ministry/assignments',
  });

  return serializeAssignment(updated);
}

export async function declineAssignment(input: {
  assignmentId: string;
  memberId: string;
  declineReason?: string | null;
  request?: Request;
}) {
  const existing = await db.serviceAssignment.findUnique({
    where: { id: input.assignmentId },
    include: assignmentInclude,
  });
  if (!existing || existing.memberId !== input.memberId) return null;

  const updated = await db.serviceAssignment.update({
    where: { id: existing.id },
    data: {
      status: 'declined',
      declineReason: input.declineReason
        ? sanitizePlainText(input.declineReason, 500)
        : null,
    },
    include: assignmentInclude,
  });

  await emitVolunteerEvent({
    type: 'assignment_declined',
    actorId: existing.member?.userId ?? null,
    entityId: updated.id,
    recipientUserId: existing.createdById,
    request: input.request,
    relatedUrl: '/admin/ministry/assignments',
  });

  return serializeAssignment(updated);
}

/**
 * Enroll a member in a training session using a transaction for capacity.
 * When full, places the member on the waitlist.
 */
export async function enrollTraining(input: {
  sessionId: string;
  memberId: string;
  actorId?: string | null;
  request?: Request;
}) {
  const result = await db.$transaction(async (tx) => {
    const session = await tx.trainingSession.findUnique({
      where: { id: input.sessionId },
      select: { id: true, capacity: true, status: true },
    });
    if (!session) {
      throw new VolunteerWriteError('not_found', 'Training session not found');
    }

    const existingEnrollment = await tx.trainingEnrollment.findUnique({
      where: {
        sessionId_memberId: {
          sessionId: input.sessionId,
          memberId: input.memberId,
        },
      },
    });
    if (existingEnrollment && existingEnrollment.status !== 'cancelled') {
      return { kind: 'already_enrolled' as const, enrollment: existingEnrollment };
    }

    const existingWait = await tx.trainingWaitlist.findUnique({
      where: {
        sessionId_memberId: {
          sessionId: input.sessionId,
          memberId: input.memberId,
        },
      },
    });
    if (existingWait) {
      return { kind: 'already_waitlisted' as const, waitlist: existingWait };
    }

    const seatedCount = await tx.trainingEnrollment.count({
      where: {
        sessionId: input.sessionId,
        status: { in: [...SEATED_ENROLLMENT_STATUSES] },
      },
    });

    const action = resolveEnrollmentCapacity({
      capacity: session.capacity,
      seatedCount,
    });

    if (action === 'waitlist') {
      const waitCount = await tx.trainingWaitlist.count({
        where: { sessionId: input.sessionId },
      });
      const waitlist = await tx.trainingWaitlist.create({
        data: {
          sessionId: input.sessionId,
          memberId: input.memberId,
          position: waitCount + 1,
        },
      });
      return { kind: 'waitlisted' as const, waitlist, seatedCount };
    }

    if (existingEnrollment?.status === 'cancelled') {
      const enrollment = await tx.trainingEnrollment.update({
        where: { id: existingEnrollment.id },
        data: { status: 'enrolled' },
      });
      return { kind: 'enrolled' as const, enrollment, seatedCount: seatedCount + 1 };
    }

    const enrollment = await tx.trainingEnrollment.create({
      data: {
        sessionId: input.sessionId,
        memberId: input.memberId,
        status: 'enrolled',
      },
    });
    return { kind: 'enrolled' as const, enrollment, seatedCount: seatedCount + 1 };
  });

  const member = await db.member.findUnique({
    where: { id: input.memberId },
    select: { userId: true },
  });

  if (result.kind === 'enrolled') {
    await emitVolunteerEvent({
      type: 'training_enrolled',
      actorId: input.actorId,
      entityId: result.enrollment.id,
      recipientUserId: member?.userId,
      request: input.request,
    });
  } else if (result.kind === 'waitlisted') {
    await emitVolunteerEvent({
      type: 'training_waitlisted',
      actorId: input.actorId,
      entityId: result.waitlist.id,
      recipientUserId: member?.userId,
      request: input.request,
    });
  }

  return result;
}

export async function startOnboardingForMember(input: {
  memberId: string;
  ministryId?: string | null;
}) {
  const template = await db.volunteerOnboardingTemplate.findFirst({
    where: {
      isActive: true,
      OR: input.ministryId
        ? [{ ministryId: input.ministryId }, { ministryId: null }]
        : [{ ministryId: null }],
    },
    orderBy: [{ ministryId: 'desc' }, { createdAt: 'asc' }],
  });
  if (!template) return null;

  return db.volunteerOnboardingProgress.upsert({
    where: {
      memberId_templateId: { memberId: input.memberId, templateId: template.id },
    },
    create: {
      memberId: input.memberId,
      templateId: template.id,
      status: 'in_progress',
    },
    update: {},
  });
}

export async function requestReplacement(input: {
  assignmentId: string;
  memberId: string;
  reason?: string | null;
  actorId?: string | null;
  request?: Request;
}) {
  const existing = await db.serviceAssignment.findUnique({
    where: { id: input.assignmentId },
    include: assignmentInclude,
  });
  if (!existing || existing.memberId !== input.memberId) return null;
  if (!ACTIVE_ASSIGNMENT_STATUSES.includes(existing.status as ServiceAssignmentStatusValue)) {
    throw new VolunteerWriteError('invalid', 'This assignment cannot request a replacement.');
  }

  const substitution = await db.volunteerSubstitution.create({
    data: {
      assignmentId: existing.id,
      originalMemberId: existing.memberId,
      status: 'requested',
      reason: input.reason ? sanitizePlainText(input.reason, 80) : 'Unavailable',
      createdById: input.actorId || null,
    },
  });

  await db.volunteerRequest.create({
    data: {
      memberId: input.memberId,
      type: 'replacement',
      status: 'submitted',
      assignmentId: existing.id,
      note: input.reason ? sanitizePlainText(input.reason, 80) : 'Unavailable',
    },
  });

  await emitVolunteerEvent({
    type: 'substitution_requested',
    actorId: input.actorId,
    entityId: substitution.id,
    recipientUserId: existing.createdById,
    request: input.request,
    relatedUrl: '/leader/volunteers',
  });

  return { substitution, assignment: serializeAssignment(existing) };
}

export async function approveSubstitution(input: {
  substitutionId: string;
  substituteMemberId: string;
  actorId: string;
  request?: Request;
}) {
  const substitution = await db.volunteerSubstitution.findUnique({
    where: { id: input.substitutionId },
    include: { assignment: { include: assignmentInclude } },
  });
  if (!substitution) return null;
  if (substitution.status !== 'requested') {
    throw new VolunteerWriteError('invalid', 'This substitution is no longer open.');
  }
  if (input.substituteMemberId === substitution.originalMemberId) {
    throw new VolunteerWriteError('invalid', 'Choose a different volunteer as the substitute.');
  }

  const original = substitution.assignment;
  const created = await createAssignment({
    eventId: original.eventId,
    memberId: input.substituteMemberId,
    ministryId: original.ministryId,
    teamId: original.teamId,
    roleId: original.roleId,
    roleName: original.roleName,
    scheduledAt: original.scheduledAt,
    endsAt: original.endsAt,
    status: 'assigned',
    createdById: input.actorId,
    request: input.request,
  });

  const [updatedOriginal, updatedSub] = await db.$transaction([
    db.serviceAssignment.update({
      where: { id: original.id },
      data: { status: 'replaced', attendanceStatus: 'substitute' },
      include: assignmentInclude,
    }),
    db.volunteerSubstitution.update({
      where: { id: substitution.id },
      data: {
        status: 'approved',
        substituteMemberId: input.substituteMemberId,
        replacementAssignmentId: created.assignment.id,
      },
    }),
  ]);

  const [originalMember, substituteMember] = await Promise.all([
    db.member.findUnique({
      where: { id: substitution.originalMemberId },
      select: { userId: true },
    }),
    db.member.findUnique({
      where: { id: input.substituteMemberId },
      select: { userId: true },
    }),
  ]);

  await emitVolunteerEvent({
    type: 'substitution_confirmed',
    actorId: input.actorId,
    entityId: substitution.id,
    recipientUserId: originalMember?.userId,
    request: input.request,
  });
  await emitVolunteerEvent({
    type: 'substitution_confirmed',
    actorId: input.actorId,
    entityId: created.assignment.id,
    recipientUserId: substituteMember?.userId,
    request: input.request,
  });

  return {
    substitution: updatedSub,
    original: serializeAssignment(updatedOriginal),
    replacement: created.assignment,
  };
}

export async function checkInAssignment(input: {
  assignmentId: string;
  actorMemberId?: string | null;
  token?: string | null;
  staffUserId?: string | null;
  attendanceStatus?: 'present' | 'late' | 'absent' | 'excused' | 'substitute';
}) {
  const existing = await db.serviceAssignment.findUnique({
    where: { id: input.assignmentId },
    include: assignmentInclude,
  });
  if (!existing) return null;
  if (existing.checkInAt) {
    throw new VolunteerWriteError('invalid', 'Already checked in.');
  }

  if (input.actorMemberId) {
    if (existing.memberId !== input.actorMemberId) {
      throw new VolunteerWriteError('unauthorized', 'You can only check in for your assignment.');
    }
  } else if (input.token) {
    if (!existing.checkInTokenHash || hashToken(input.token) !== existing.checkInTokenHash) {
      throw new VolunteerWriteError('unauthorized', 'Invalid check-in token.');
    }
  } else if (!input.staffUserId) {
    throw new VolunteerWriteError('unauthorized', 'Check-in is not authorized.');
  }

  const now = new Date();
  const late =
    now.getTime() - existing.scheduledAt.getTime() > 15 * 60 * 1000 ? 'late' : 'present';
  const attendanceStatus = input.attendanceStatus || late;
  const hoursMinutes = computeHoursMinutes({
    checkInAt: now,
    checkOutAt: null,
    scheduledAt: existing.scheduledAt,
    endsAt: existing.endsAt,
    attendanceStatus,
  });

  const updated = await db.serviceAssignment.update({
    where: { id: existing.id },
    data: {
      checkInAt: now,
      attendanceStatus,
      hoursMinutes,
    },
    include: assignmentInclude,
  });

  return serializeAssignment(updated);
}

export async function checkOutAssignment(input: {
  assignmentId: string;
  actorMemberId?: string | null;
  staffUserId?: string | null;
}) {
  const existing = await db.serviceAssignment.findUnique({
    where: { id: input.assignmentId },
    include: assignmentInclude,
  });
  if (!existing) return null;
  if (input.actorMemberId && existing.memberId !== input.actorMemberId) {
    throw new VolunteerWriteError('unauthorized', 'You can only check out of your assignment.');
  }
  if (!existing.checkInAt) {
    throw new VolunteerWriteError('invalid', 'Check in first.');
  }
  if (existing.checkOutAt) {
    throw new VolunteerWriteError('invalid', 'Already checked out.');
  }

  const now = new Date();
  const hoursMinutes = computeHoursMinutes({
    checkInAt: existing.checkInAt,
    checkOutAt: now,
    scheduledAt: existing.scheduledAt,
    endsAt: existing.endsAt,
    attendanceStatus: existing.attendanceStatus || 'present',
  });

  const updated = await db.serviceAssignment.update({
    where: { id: existing.id },
    data: {
      checkOutAt: now,
      hoursMinutes,
      status: 'completed',
      attendanceStatus: existing.attendanceStatus || 'present',
    },
    include: assignmentInclude,
  });

  return serializeAssignment(updated);
}

export async function correctHours(input: {
  assignmentId: string;
  hoursMinutes: number;
  attendanceStatus?: 'present' | 'late' | 'absent' | 'excused' | 'substitute';
  reason?: string | null;
  actorId: string;
  request?: Request;
}) {
  const existing = await db.serviceAssignment.findUnique({
    where: { id: input.assignmentId },
  });
  if (!existing) return null;

  const newMinutes = assertNonNegativeHours(input.hoursMinutes);
  await db.volunteerHourCorrection.create({
    data: {
      assignmentId: existing.id,
      oldMinutes: existing.hoursMinutes ?? 0,
      newMinutes,
      reason: input.reason ? sanitizePlainText(input.reason, 200) : null,
      actorId: input.actorId,
    },
  });

  const updated = await db.serviceAssignment.update({
    where: { id: existing.id },
    data: {
      hoursMinutes: newMinutes,
      attendanceStatus: input.attendanceStatus ?? existing.attendanceStatus,
    },
    include: assignmentInclude,
  });

  await emitVolunteerEvent({
    type: 'assignment_changed',
    actorId: input.actorId,
    entityId: updated.id,
    request: input.request,
  });

  return serializeAssignment(updated);
}

export async function transferTeamMember(input: {
  fromTeamId: string;
  toTeamId: string;
  memberId: string;
  roleLabel?: string | null;
}) {
  const [from, to] = await Promise.all([
    db.ministryTeam.findUnique({ where: { id: input.fromTeamId } }),
    db.ministryTeam.findUnique({ where: { id: input.toTeamId } }),
  ]);
  if (!from || !to) throw new VolunteerWriteError('not_found', 'Team not found');

  await db.$transaction(async (tx) => {
    await tx.ministryTeamMember.updateMany({
      where: { teamId: input.fromTeamId, memberId: input.memberId },
      data: { status: 'transferred', endDate: new Date() },
    });
    await tx.ministryTeamMember.upsert({
      where: { teamId_memberId: { teamId: input.toTeamId, memberId: input.memberId } },
      create: {
        teamId: input.toTeamId,
        memberId: input.memberId,
        roleLabel: input.roleLabel || null,
        status: 'active',
        startDate: new Date(),
      },
      update: {
        status: 'active',
        endDate: null,
        roleLabel: input.roleLabel || undefined,
      },
    });
  });
}
