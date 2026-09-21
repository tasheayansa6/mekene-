import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import {
  serializeApplicationForMember,
  serializeAssignment,
  serializeVolunteerProfile,
  volunteerProfileInclude,
} from '@/lib/volunteers/serialize';
import { memberVolunteeringDashboard } from '@/lib/volunteers/dashboard';
import { ONBOARDING_STATUS_LABELS, enrollmentStatusLabel, volunteerStatusLabel } from '@/lib/volunteers/status';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const member = await db.member.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!member) {
    return success({
      profile: null,
      skills: [],
      teams: [],
      upcoming: [],
      hoursMinutes: 0,
      training: [],
      requests: [],
      onboarding: [],
      participation: null,
    });
  }

  const data = await memberVolunteeringDashboard(member.id);
  const profile = data.profile
    ? serializeVolunteerProfile({
        ...data.profile,
        member: undefined,
      })
    : null;

  const fullProfile = data.profile
    ? await db.volunteerProfile.findUnique({
        where: { memberId: member.id },
        include: volunteerProfileInclude,
      })
    : null;

  return success({
    profile: fullProfile ? serializeVolunteerProfile(fullProfile) : profile,
    skills: data.skills.map((s) => ({
      id: s.id,
      proficiency: s.proficiency,
      skill: s.skill,
    })),
    teams: data.teams.map((t) => ({
      id: t.id,
      roleLabel: t.roleLabel,
      status: t.status,
      team: {
        id: t.team.id,
        name: t.team.name,
        slug: t.team.slug,
        ministry: t.team.ministry,
      },
    })),
    upcoming: data.upcoming.slice(0, 8).map(serializeAssignment),
    hoursMinutes: data.hoursMinutes,
    attendance: data.assignments.slice(0, 12).map((row) => ({
      id: row.id,
      status: row.status,
      attendanceStatus: row.attendanceStatus,
      scheduledAt: row.scheduledAt.toISOString(),
      hoursMinutes: row.hoursMinutes,
      roleName: row.roleName,
      event: row.event,
    })),
    applications: data.applications.map(serializeApplicationForMember),
    requests: data.requests.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    })),
    training: data.enrollments.map((row) => ({
      id: row.id,
      status: row.status,
      statusLabel: enrollmentStatusLabel(row.status),
      session: row.session.title,
      program: row.session.program.name,
      startsAt: row.session.startsAt.toISOString(),
    })),
    qualifications: data.qualifications.map((row) => ({
      id: row.id,
      title: row.title,
      issuer: row.issuer,
      earnedAt: row.earnedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
    })),
    onboarding: data.onboarding.map((row) => ({
      id: row.id,
      status: row.status,
      statusLabel: ONBOARDING_STATUS_LABELS[row.status] || row.status,
      template: row.template.name,
      completedCount: row.completions.length,
    })),
    participation: data.participation,
    statusLabel: data.profile ? volunteerStatusLabel(data.profile.status) : null,
  });
}
