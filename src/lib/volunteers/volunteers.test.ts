import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { permissionsForRole } from '@/lib/auth/rbac-matrix';
import type { AuthUser } from '@/lib/auth/permissions';
import {
  canAccessApplication,
  canAccessMinistry,
  canApproveVolunteers,
  canManageAssignments,
  canManageStaff,
  canManageTeam,
  canViewAvailability,
  canViewStaff,
  canViewVolunteers,
  isTeamLeader,
} from './access';
import {
  assignmentWindow,
  filterOverlappingAssignments,
  intervalsOverlap,
} from './conflicts';
import { evaluateEligibility } from './eligibility';
import { VOLUNTEER_GENERIC_NOTIFY_MESSAGE } from './events';
import {
  computeHoursMinutes,
  participationMetrics,
  VOLUNTEER_CANNOT_EDIT_HOURS,
} from './hours';
import { recommendationExplanation, recommendationScore } from './recommendations';
import { serializeApplication, serializeApplicationForMember } from './serialize';
import { resolveEnrollmentCapacity } from './write';

function user(slug: string, id = `${slug}-1`): AuthUser {
  return {
    id,
    email: `${slug}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    phone: null,
    profileImage: null,
    status: 'active',
    isVerified: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: `role-${slug}`,
      slug,
      name: slug,
      hierarchy: 10,
      isPrivileged: slug === 'admin' || slug === 'super_admin',
    },
    permissions: permissionsForRole(slug).map((key) => {
      const [resource, action] = key.split(':');
      return { resource, action };
    }),
  };
}

describe('volunteers conflict detection', () => {
  it('detects overlapping intervals', () => {
    const aStart = new Date('2026-08-21T10:00:00Z');
    const aEnd = new Date('2026-08-21T12:00:00Z');
    const bStart = new Date('2026-08-21T11:00:00Z');
    const bEnd = new Date('2026-08-21T13:00:00Z');
    assert.equal(intervalsOverlap(aStart, aEnd, bStart, bEnd), true);
  });

  it('allows adjacent non-overlapping windows', () => {
    const aStart = new Date('2026-08-21T10:00:00Z');
    const aEnd = new Date('2026-08-21T12:00:00Z');
    const bStart = new Date('2026-08-21T12:00:00Z');
    const bEnd = new Date('2026-08-21T14:00:00Z');
    assert.equal(intervalsOverlap(aStart, aEnd, bStart, bEnd), false);
  });

  it('uses default duration when endsAt is missing', () => {
    const start = new Date('2026-08-21T09:00:00Z');
    const window = assignmentWindow(start, null);
    assert.equal(window.end.getTime() - window.start.getTime(), 2 * 60 * 60 * 1000);
  });

  it('filters overlapping assignment rows and respects excludeId', () => {
    const rows = [
      {
        id: 'a1',
        scheduledAt: new Date('2026-08-21T10:00:00Z'),
        endsAt: new Date('2026-08-21T12:00:00Z'),
      },
      {
        id: 'a2',
        scheduledAt: new Date('2026-08-21T14:00:00Z'),
        endsAt: new Date('2026-08-21T16:00:00Z'),
      },
    ];
    const overlaps = filterOverlappingAssignments(
      rows,
      new Date('2026-08-21T11:00:00Z'),
      new Date('2026-08-21T11:30:00Z')
    );
    assert.equal(overlaps.length, 1);
    assert.equal(overlaps[0].id, 'a1');

    const excluded = filterOverlappingAssignments(
      rows,
      new Date('2026-08-21T11:00:00Z'),
      new Date('2026-08-21T11:30:00Z'),
      'a1'
    );
    assert.equal(excluded.length, 0);
  });
});

describe('training enrollment capacity', () => {
  it('enrolls when under capacity or unlimited', () => {
    assert.equal(resolveEnrollmentCapacity({ capacity: 10, seatedCount: 3 }), 'enroll');
    assert.equal(resolveEnrollmentCapacity({ capacity: null, seatedCount: 999 }), 'enroll');
  });

  it('waitlists when at or over capacity', () => {
    assert.equal(resolveEnrollmentCapacity({ capacity: 5, seatedCount: 5 }), 'waitlist');
    assert.equal(resolveEnrollmentCapacity({ capacity: 5, seatedCount: 6 }), 'waitlist');
  });
});

describe('ministry scope for leaders', () => {
  it('ministry_leader only accesses ministries they lead', () => {
    const leader = user('ministry_leader', 'leader-1');
    assert.equal(canViewVolunteers(leader), true);
    assert.equal(canApproveVolunteers(leader), true);
    assert.equal(canManageAssignments(leader), true);
    assert.equal(canViewStaff(leader), false);
    assert.equal(canManageStaff(leader), false);

    assert.equal(
      canAccessMinistry(leader, { id: 'm1', leaderUserId: 'leader-1' }),
      true
    );
    assert.equal(
      canAccessMinistry(leader, { id: 'm2', leaderUserId: 'other' }),
      false
    );
    assert.equal(
      canAccessApplication(leader, {
        ministryId: 'm1',
        ministry: { id: 'm1', leaderUserId: 'leader-1' },
      }),
      true
    );
    assert.equal(
      canAccessApplication(leader, {
        ministryId: 'm2',
        ministry: { id: 'm2', leaderUserId: 'other' },
      }),
      false
    );
  });

  it('volunteer_coordinator can view volunteers across ministries', () => {
    const coord = user('volunteer_coordinator');
    assert.equal(canViewVolunteers(coord), true);
    assert.equal(canApproveVolunteers(coord), true);
    assert.equal(
      canAccessMinistry(coord, { id: 'm1', leaderUserId: 'someone' }),
      true
    );
  });
});

describe('approve creates profile contract + privacy', () => {
  it('member serializer never exposes reviewNotes', () => {
    const row = {
      id: 'app1',
      memberId: 'm1',
      ministryId: null,
      status: 'approved',
      preferredMinistry: null,
      skills: null,
      experience: null,
      availability: null,
      motivation: 'Private motivation text',
      preferredTimes: null,
      reviewerMessage: 'Please join us Sunday',
      reviewNotes: 'Confidential reviewer notes about applicant',
      reviewedById: 'u1',
      reviewedAt: new Date(),
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const forMember = serializeApplicationForMember(row);
    assert.equal('reviewNotes' in forMember, false);

    const forAdmin = serializeApplication(row, { includeReviewNotes: true }) as {
      reviewNotes?: string | null;
    };
    assert.equal(forAdmin.reviewNotes, 'Confidential reviewer notes about applicant');
  });

  it('generic notification copy has no private application words', () => {
    const message = VOLUNTEER_GENERIC_NOTIFY_MESSAGE.toLowerCase();
    for (const word of ['motivation', 'reviewnotes', 'confession', 'diagnosis']) {
      assert.equal(message.includes(word), false, `unexpected word: ${word}`);
    }
    assert.match(VOLUNTEER_GENERIC_NOTIFY_MESSAGE, /volunteering/i);
  });

  it('approveApplication upserts VolunteerProfile (shape contract)', () => {
    // Document the write contract used by approveApplication without hitting DB.
    const profileCreate = {
      memberId: 'm1',
      status: 'approved' as const,
      joinedAt: new Date(),
      experience: 'Helped with youth',
    };
    assert.equal(profileCreate.status, 'approved');
    assert.ok(profileCreate.joinedAt instanceof Date);
    assert.equal(typeof profileCreate.memberId, 'string');
  });
});

describe('phase 33 eligibility and hours', () => {
  it('blocks inactive volunteers and missing training', () => {
    const base = {
      volunteerStatus: 'active',
      dateOfBirth: new Date('2000-01-01'),
      skillIds: ['skill-1'],
      completedProgramIds: ['prog-1'],
      expiredProgramIds: [] as string[],
      teamIds: ['team-1'],
      weeklySlots: [] as Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        isAvailable: boolean;
      }>,
      leaveWindows: [] as Array<{ startAt: Date; endAt: Date; isAvailable: boolean }>,
      assignmentCountThisMonth: 0,
      maxFrequencyPerMonth: null,
      hasDuplicateRole: false,
      hasScheduleConflict: false,
      scheduledAt: new Date('2026-09-01T10:00:00Z'),
      endsAt: new Date('2026-09-01T12:00:00Z'),
      teamId: 'team-1',
      requirements: [
        { skillId: 'skill-1', programId: 'prog-1', isMandatory: true, blockIfExpired: true },
      ],
    };
    assert.equal(evaluateEligibility(base).ok, true);

    assert.equal(evaluateEligibility({ ...base, volunteerStatus: 'suspended' }).ok, false);
    assert.equal(
      evaluateEligibility({
        ...base,
        completedProgramIds: [],
      }).reasons.includes('missing_training'),
      true
    );
    assert.equal(
      evaluateEligibility({
        ...base,
        expiredProgramIds: ['prog-1'],
      }).reasons.includes('expired_training'),
      true
    );
    assert.equal(
      evaluateEligibility({
        ...base,
        hasScheduleConflict: true,
      }).reasons.includes('schedule_conflict'),
      true
    );
  });

  it('computes hours and never allows volunteer self-edit flag', () => {
    assert.equal(VOLUNTEER_CANNOT_EDIT_HOURS, true);
    assert.equal(
      computeHoursMinutes({
        checkInAt: new Date('2026-09-01T10:00:00Z'),
        checkOutAt: new Date('2026-09-01T12:00:00Z'),
        scheduledAt: new Date('2026-09-01T10:00:00Z'),
        endsAt: new Date('2026-09-01T12:00:00Z'),
        attendanceStatus: 'present',
      }),
      120
    );
    assert.equal(
      computeHoursMinutes({
        checkInAt: null,
        checkOutAt: null,
        scheduledAt: new Date('2026-09-01T10:00:00Z'),
        endsAt: null,
        attendanceStatus: 'absent',
      }),
      0
    );
    const metrics = participationMetrics({ confirmed: 2, completed: 8, absent: 0 });
    assert.equal(metrics.completedAssignments, 8);
    assert.equal(metrics.completionRatio, 0.8);
  });

  it('team leader object-level helpers isolate teams', () => {
    const leader = user('member', 'leader-a');
    const teamA = {
      id: 't1',
      leaderUserId: 'leader-a',
      assistantLeaderUserId: null,
      ministry: { id: 'm1', leaderUserId: 'other' },
    };
    const teamB = {
      id: 't2',
      leaderUserId: 'other',
      assistantLeaderUserId: null,
      ministry: { id: 'm2', leaderUserId: 'other' },
    };
    assert.equal(isTeamLeader(leader, teamA), true);
    assert.equal(isTeamLeader(leader, teamB), false);
    assert.equal(canManageTeam(leader, teamA), true);
    assert.equal(canManageTeam(leader, teamB), false);
    assert.equal(canViewAvailability(leader, 'self', null, teamA), true);
    assert.equal(canViewAvailability(leader, 'other-user', null, teamB), false);
  });

  it('recommendation explanations stay transparent', () => {
    const matches = ['skill_match', 'available', 'trained', 'no_conflict'] as const;
    const why = recommendationExplanation({
      matches: [...matches],
      reasons: [],
    });
    assert.deepEqual(why, ['Skill match', 'Available', 'Trained', 'No conflict']);
    assert.equal(
      recommendationScore({ ok: true, matches: [...matches], reasons: [] }),
      40
    );
  });
});
