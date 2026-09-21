import { db } from '@/lib/db';
import { forbidden, success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canViewEventReports } from '@/lib/events/registration-access';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'events', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewEventReports(auth.user)) return forbidden();

  const now = new Date();
  const [
    totalEvents,
    upcomingEvents,
    completedEvents,
    cancelledEvents,
    registrations,
    cancellations,
    waitlisted,
    attended,
  ] = await Promise.all([
    db.event.count({ where: { status: { not: 'archived' } } }),
    db.event.count({
      where: {
        status: { in: ['published', 'scheduled'] },
        endAt: { gte: now },
      },
    }),
    db.event.count({ where: { status: 'completed' } }),
    db.event.count({ where: { status: 'cancelled' } }),
    db.eventRegistration.count({
      where: { status: { in: ['registered', 'confirmed', 'attended'] } },
    }),
    db.eventRegistration.count({ where: { status: 'cancelled' } }),
    db.eventRegistration.count({ where: { status: 'waitlisted' } }),
    db.eventRegistration.count({ where: { status: 'attended' } }),
  ]);

  const noShows = await db.eventRegistration.count({ where: { status: 'no_show' } });
  const conversion =
    registrations + cancellations === 0
      ? 0
      : Math.round((registrations / (registrations + cancellations)) * 1000) / 10;

  return success({
    metrics: {
      totalEvents,
      upcomingEvents,
      completedEvents,
      cancelledEvents,
      registrations,
      cancellations,
      waitlisted,
      attended,
      noShows,
      registrationRetentionPercent: conversion,
    },
  });
}
