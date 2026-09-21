import { db } from '@/lib/db';
import { SEATED_ENROLLMENT_STATUSES } from './status';
import { participationMetrics } from './hours';

export async function memberVolunteeringDashboard(memberId: string) {
  const now = new Date();
  const [
    profile,
    skills,
    teams,
    assignments,
    applications,
    requests,
    enrollments,
    qualifications,
    onboarding,
  ] = await Promise.all([
    db.volunteerProfile.findUnique({ where: { memberId } }),
    db.volunteerSkill.findMany({
      where: { memberId },
      include: { skill: { select: { id: true, name: true, slug: true } } },
    }),
    db.ministryTeamMember.findMany({
      where: { memberId, status: 'active' },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
            ministry: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),
    db.serviceAssignment.findMany({
      where: { memberId },
      include: {
        event: { select: { id: true, title: true, slug: true, startAt: true, endAt: true } },
        ministry: { select: { id: true, name: true, slug: true } },
        team: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 80,
    }),
    db.volunteerApplication.findMany({
      where: { memberId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    db.volunteerRequest.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.trainingEnrollment.findMany({
      where: { memberId, status: { in: [...SEATED_ENROLLMENT_STATUSES] } },
      include: {
        session: {
          select: {
            title: true,
            startsAt: true,
            program: { select: { id: true, name: true, expiresAfterDays: true } },
          },
        },
      },
      take: 30,
    }),
    db.volunteerQualification.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.volunteerOnboardingProgress.findMany({
      where: { memberId },
      include: {
        template: { select: { id: true, name: true } },
        completions: { select: { itemId: true } },
      },
    }),
  ]);

  const upcoming = assignments.filter(
    (row) =>
      row.scheduledAt >= now &&
      ['proposed', 'assigned', 'confirmed'].includes(row.status)
  );
  const hoursMinutes = assignments.reduce((sum, row) => sum + (row.hoursMinutes ?? 0), 0);
  const metrics = participationMetrics({
    confirmed: assignments.filter((row) => row.status === 'confirmed').length,
    completed: assignments.filter((row) => row.status === 'completed').length,
    absent: assignments.filter((row) => row.status === 'absent').length,
  });

  return {
    profile,
    skills,
    teams,
    upcoming,
    assignments,
    applications,
    requests,
    enrollments,
    qualifications,
    onboarding,
    hoursMinutes,
    participation: metrics,
  };
}
