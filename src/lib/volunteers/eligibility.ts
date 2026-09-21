import { db } from '@/lib/db';
import { assignmentWindow, detectOverlappingAssignments } from './conflicts';
import {
  SCHEDULABLE_VOLUNTEER_STATUSES,
  SEATED_ENROLLMENT_STATUSES,
  type VolunteerStatusValue,
} from './status';

export type EligibilityReason =
  | 'inactive_status'
  | 'missing_skill'
  | 'missing_training'
  | 'expired_training'
  | 'unavailable'
  | 'on_leave'
  | 'not_on_team'
  | 'under_age'
  | 'schedule_conflict'
  | 'frequency_cap'
  | 'duplicate_assignment';

export type EligibilityMatch =
  | 'skill_match'
  | 'available'
  | 'trained'
  | 'no_conflict'
  | 'team_member';

export type EligibilityRequirement = {
  skillId?: string | null;
  programId?: string | null;
  minAgeYears?: number | null;
  requireTeamMembership?: boolean;
  blockIfExpired?: boolean;
  isMandatory?: boolean;
  teamId?: string | null;
};

export type EligibilityFacts = {
  volunteerStatus: string | null;
  dateOfBirth: Date | null;
  skillIds: string[];
  completedProgramIds: string[];
  expiredProgramIds: string[];
  teamIds: string[];
  weeklySlots: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
  leaveWindows: Array<{ startAt: Date; endAt: Date; isAvailable: boolean }>;
  assignmentCountThisMonth: number;
  maxFrequencyPerMonth: number | null;
  hasDuplicateRole: boolean;
  hasScheduleConflict: boolean;
  scheduledAt: Date;
  endsAt: Date | null;
  teamId: string | null;
  requirements: EligibilityRequirement[];
};

export function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function dateOfBirthToAgeYears(dob: Date | null, at: Date): number | null {
  if (!dob) return null;
  let age = at.getUTCFullYear() - dob.getUTCFullYear();
  const month = at.getUTCMonth() - dob.getUTCMonth();
  if (month < 0 || (month === 0 && at.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export function slotCoversWindow(input: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  scheduledAt: Date;
  endsAt: Date | null;
}): boolean {
  if (!input.isAvailable) return false;
  if (input.scheduledAt.getUTCDay() !== input.dayOfWeek) return false;
  const startMin =
    input.scheduledAt.getUTCHours() * 60 + input.scheduledAt.getUTCMinutes();
  const end = input.endsAt ?? new Date(input.scheduledAt.getTime() + 2 * 60 * 60 * 1000);
  const endMin = end.getUTCHours() * 60 + end.getUTCMinutes();
  return (
    hhmmToMinutes(input.startTime) <= startMin && hhmmToMinutes(input.endTime) >= endMin
  );
}

export function isOnLeave(
  windows: Array<{ startAt: Date; endAt: Date; isAvailable: boolean }>,
  start: Date,
  end: Date
): boolean {
  return windows.some(
    (row) =>
      !row.isAvailable &&
      row.startAt.getTime() < end.getTime() &&
      start.getTime() < row.endAt.getTime()
  );
}

export function evaluateEligibility(facts: EligibilityFacts): {
  ok: boolean;
  reasons: EligibilityReason[];
  matches: EligibilityMatch[];
} {
  const reasons: EligibilityReason[] = [];
  const matches: EligibilityMatch[] = [];
  const window = assignmentWindow(facts.scheduledAt, facts.endsAt);

  if (
    !facts.volunteerStatus ||
    !SCHEDULABLE_VOLUNTEER_STATUSES.includes(facts.volunteerStatus as VolunteerStatusValue)
  ) {
    reasons.push('inactive_status');
  }

  if (facts.hasDuplicateRole) reasons.push('duplicate_assignment');
  if (facts.hasScheduleConflict) reasons.push('schedule_conflict');
  else matches.push('no_conflict');

  if (isOnLeave(facts.leaveWindows, window.start, window.end)) {
    reasons.push('on_leave');
  }

  const covers =
    facts.weeklySlots.length === 0
      ? true
      : facts.weeklySlots.some((slot) =>
          slotCoversWindow({
            ...slot,
            scheduledAt: facts.scheduledAt,
            endsAt: facts.endsAt,
          })
        );
  if (facts.weeklySlots.length > 0 && !covers) reasons.push('unavailable');
  else if (covers) matches.push('available');

  if (
    facts.maxFrequencyPerMonth != null &&
    facts.assignmentCountThisMonth >= facts.maxFrequencyPerMonth
  ) {
    reasons.push('frequency_cap');
  }

  const requiredSkills = facts.requirements
    .filter((row) => row.isMandatory !== false && row.skillId)
    .map((row) => row.skillId as string);
  const missingSkill = requiredSkills.find((id) => !facts.skillIds.includes(id));
  if (missingSkill) reasons.push('missing_skill');
  else if (requiredSkills.length > 0) matches.push('skill_match');

  const requiredPrograms = facts.requirements.filter(
    (row) => row.isMandatory !== false && row.programId
  );
  for (const req of requiredPrograms) {
    const programId = req.programId as string;
    if (!facts.completedProgramIds.includes(programId)) {
      reasons.push('missing_training');
    } else if (req.blockIfExpired !== false && facts.expiredProgramIds.includes(programId)) {
      reasons.push('expired_training');
    }
  }
  if (
    requiredPrograms.length > 0 &&
    !reasons.includes('missing_training') &&
    !reasons.includes('expired_training')
  ) {
    matches.push('trained');
  }

  const teamRequired = facts.requirements.some(
    (row) => row.isMandatory !== false && (row.requireTeamMembership || row.teamId)
  );
  const neededTeam = facts.teamId;
  if (teamRequired && neededTeam && !facts.teamIds.includes(neededTeam)) {
    reasons.push('not_on_team');
  } else if (neededTeam && facts.teamIds.includes(neededTeam)) {
    matches.push('team_member');
  }

  const minAge = facts.requirements
    .map((row) => row.minAgeYears)
    .filter((value): value is number => typeof value === 'number' && value > 0)
    .sort((a, b) => b - a)[0];
  if (minAge) {
    const age = dateOfBirthToAgeYears(facts.dateOfBirth, facts.scheduledAt);
    if (age == null || age < minAge) reasons.push('under_age');
  }

  return { ok: reasons.length === 0, reasons: [...new Set(reasons)], matches: [...new Set(matches)] };
}

function monthBounds(at: Date) {
  const start = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
  const end = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1));
  return { start, end };
}

export async function gatherEligibilityFacts(input: {
  memberId: string;
  ministryId?: string | null;
  teamId?: string | null;
  roleId?: string | null;
  eventId: string;
  roleName: string;
  scheduledAt: Date;
  endsAt?: Date | null;
  excludeAssignmentId?: string;
}): Promise<EligibilityFacts> {
  const { start: monthStart, end: monthEnd } = monthBounds(input.scheduledAt);
  const window = assignmentWindow(input.scheduledAt, input.endsAt ?? null);

  const [member, profile, skills, teams, slots, exceptions, requirements, role, monthCount, duplicates, overlaps] =
    await Promise.all([
      db.member.findUnique({
        where: { id: input.memberId },
        select: { id: true, dateOfBirth: true },
      }),
      db.volunteerProfile.findUnique({
        where: { memberId: input.memberId },
        select: { status: true, maxFrequencyPerMonth: true },
      }),
      db.volunteerSkill.findMany({
        where: { memberId: input.memberId },
        select: { skillId: true },
      }),
      db.ministryTeamMember.findMany({
        where: { memberId: input.memberId, status: 'active' },
        select: { teamId: true },
      }),
      db.volunteerAvailability.findMany({
        where: { memberId: input.memberId },
        select: { dayOfWeek: true, startTime: true, endTime: true, isAvailable: true },
      }),
      db.availabilityException.findMany({
        where: {
          memberId: input.memberId,
          startAt: { lt: window.end },
          endAt: { gt: window.start },
        },
        select: { startAt: true, endAt: true, isAvailable: true },
      }),
      input.ministryId
        ? db.volunteerMinistryRequirement.findMany({
            where: {
              ministryId: input.ministryId,
              OR: [
                { teamId: null, roleId: null },
                ...(input.teamId ? [{ teamId: input.teamId }] : []),
                ...(input.roleId ? [{ roleId: input.roleId }] : []),
              ],
            },
          })
        : Promise.resolve([]),
      input.roleId
        ? db.volunteerRole.findUnique({
            where: { id: input.roleId },
            select: {
              requiredSkillId: true,
              requiredProgramId: true,
              requireTeamMembership: true,
              teamId: true,
            },
          })
        : Promise.resolve(null),
      db.serviceAssignment.count({
        where: {
          memberId: input.memberId,
          scheduledAt: { gte: monthStart, lt: monthEnd },
          status: { in: ['proposed', 'assigned', 'confirmed', 'completed'] },
          ...(input.excludeAssignmentId ? { id: { not: input.excludeAssignmentId } } : {}),
        },
      }),
      db.serviceAssignment.findFirst({
        where: {
          memberId: input.memberId,
          eventId: input.eventId,
          roleName: input.roleName,
          status: { in: ['proposed', 'assigned', 'confirmed'] },
          ...(input.excludeAssignmentId ? { id: { not: input.excludeAssignmentId } } : {}),
        },
        select: { id: true },
      }),
      detectOverlappingAssignments(
        input.memberId,
        window.start,
        window.end,
        input.excludeAssignmentId
      ),
    ]);

  const programIds = [
    ...requirements.map((row) => row.programId).filter(Boolean),
    role?.requiredProgramId,
  ].filter((id): id is string => Boolean(id));

  const enrollments =
    programIds.length > 0
      ? await db.trainingEnrollment.findMany({
          where: {
            memberId: input.memberId,
            status: { in: [...SEATED_ENROLLMENT_STATUSES] },
            session: { programId: { in: programIds } },
          },
          include: {
            session: {
              select: {
                programId: true,
                program: { select: { expiresAfterDays: true } },
              },
            },
          },
        })
      : [];

  const completedProgramIds: string[] = [];
  const expiredProgramIds: string[] = [];
  for (const enrollment of enrollments) {
    if (enrollment.status !== 'completed' && enrollment.status !== 'attended') continue;
    const programId = enrollment.session.programId;
    completedProgramIds.push(programId);
    const days = enrollment.session.program.expiresAfterDays;
    if (days && days > 0) {
      const expiresAt = new Date(enrollment.updatedAt.getTime() + days * 24 * 60 * 60 * 1000);
      if (expiresAt.getTime() <= input.scheduledAt.getTime()) {
        expiredProgramIds.push(programId);
      }
    }
  }

  const quals = programIds.length
    ? await db.volunteerQualification.findMany({
        where: { memberId: input.memberId, programId: { in: programIds } },
        select: { programId: true, expiresAt: true },
      })
    : [];
  for (const qual of quals) {
    if (!qual.programId) continue;
    completedProgramIds.push(qual.programId);
    if (qual.expiresAt && qual.expiresAt.getTime() <= input.scheduledAt.getTime()) {
      expiredProgramIds.push(qual.programId);
    }
  }

  const reqs: EligibilityRequirement[] = requirements.map((row) => ({
    skillId: row.skillId,
    programId: row.programId,
    minAgeYears: row.minAgeYears,
    requireTeamMembership: row.requireTeamMembership,
    blockIfExpired: row.blockIfExpired,
    isMandatory: row.isMandatory,
    teamId: row.teamId,
  }));
  if (role) {
    reqs.push({
      skillId: role.requiredSkillId,
      programId: role.requiredProgramId,
      requireTeamMembership: role.requireTeamMembership,
      teamId: role.teamId,
      isMandatory: true,
      blockIfExpired: true,
    });
  }

  return {
    volunteerStatus: profile?.status ?? null,
    dateOfBirth: member?.dateOfBirth ?? null,
    skillIds: skills.map((row) => row.skillId),
    completedProgramIds: [...new Set(completedProgramIds)],
    expiredProgramIds: [...new Set(expiredProgramIds)],
    teamIds: teams.map((row) => row.teamId),
    weeklySlots: slots,
    leaveWindows: exceptions,
    assignmentCountThisMonth: monthCount,
    maxFrequencyPerMonth: profile?.maxFrequencyPerMonth ?? null,
    hasDuplicateRole: Boolean(duplicates),
    hasScheduleConflict: overlaps.length > 0,
    scheduledAt: input.scheduledAt,
    endsAt: input.endsAt ?? null,
    teamId: input.teamId ?? role?.teamId ?? null,
    requirements: reqs,
  };
}

export function eligibilityMessage(reasons: EligibilityReason[]): string {
  if (reasons.includes('inactive_status')) {
    return 'This volunteer is not in an active serving status.';
  }
  if (reasons.includes('duplicate_assignment')) {
    return 'This volunteer is already assigned to that role for this service.';
  }
  if (reasons.includes('schedule_conflict')) {
    return 'This volunteer already has an overlapping service assignment.';
  }
  if (reasons.includes('missing_training') || reasons.includes('expired_training')) {
    return 'Required training is missing or expired.';
  }
  if (reasons.includes('missing_skill')) {
    return 'Required skill is missing.';
  }
  if (reasons.includes('not_on_team')) {
    return 'This volunteer is not on the required team.';
  }
  if (reasons.includes('under_age')) {
    return 'This volunteer does not meet the minimum age for this assignment.';
  }
  if (reasons.includes('on_leave') || reasons.includes('unavailable')) {
    return 'This volunteer is not available for that time.';
  }
  if (reasons.includes('frequency_cap')) {
    return 'This volunteer has reached their maximum service frequency.';
  }
  return 'This volunteer is not eligible for that assignment.';
}
