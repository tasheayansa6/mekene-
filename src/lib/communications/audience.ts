import type { AnnouncementAudience, AppNotificationType, NotificationPreference } from '@prisma/client';
import { db } from '@/lib/db';
import { ADMIN_PORTAL_ROLES } from '@/lib/auth/config';

export type NotificationChannelPref = 'in_app' | 'email' | 'telegram' | 'sms';

export async function getOrCreatePreferences(userId: string): Promise<NotificationPreference> {
  const existing = await db.notificationPreference.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.notificationPreference.create({
    data: { userId },
  });
}

export function allowsChannel(
  prefs: NotificationPreference,
  type: AppNotificationType,
  channel: NotificationChannelPref,
  transactional: boolean
): boolean {
  if (transactional) return true;

  if (channel === 'in_app') {
    if (type === 'event_reminder') return prefs.inAppEvents;
    if (type === 'membership_update') return prefs.inAppMembership;
    return prefs.inAppGeneral;
  }

  if (channel === 'email') {
    if (type === 'announcement' || type === 'news' || type === 'notice') {
      return prefs.emailAnnouncements;
    }
    if (type === 'event_reminder') return prefs.emailEvents;
    if (type === 'ministry_update') return prefs.emailMinistry;
    if (
      type === 'membership_update' ||
      type === 'giving_notification' ||
      type === 'attendance_notice'
    ) {
      return true;
    }
    return prefs.emailMarketing;
  }

  if (channel === 'telegram') return prefs.telegramEnabled;
  if (channel === 'sms') return prefs.smsEnabled;

  return false;
}

async function householdMemberUserIds(householdId: string): Promise<Set<string>> {
  const [directMembers, linkedMembers] = await Promise.all([
    db.member.findMany({
      where: { householdId, user: { status: 'active' } },
      select: { userId: true },
    }),
    db.householdMembership.findMany({
      where: { householdId, member: { user: { status: 'active' } } },
      select: { member: { select: { userId: true } } },
    }),
  ]);
  return new Set([
    ...directMembers.map((m) => m.userId),
    ...linkedMembers.map((m) => m.member.userId),
  ]);
}

function intersectHousehold(userIds: string[], householdIds: Set<string>): string[] {
  if (householdIds.size === 0) return [];
  return userIds.filter((id) => householdIds.has(id));
}

export async function resolveAudienceUserIds(input: {
  audience: AnnouncementAudience;
  ministryId?: string | null;
  eventId?: string | null;
  householdId?: string | null;
}): Promise<string[]> {
  const activeUser = { status: 'active' as const };
  let userIds: string[] = [];

  if (input.audience === 'everyone') {
    const users = await db.user.findMany({
      where: activeUser,
      select: { id: true },
      take: 5000,
    });
    userIds = users.map((u) => u.id);
  } else if (input.audience === 'members') {
    const members = await db.member.findMany({
      where: {
        status: { in: ['approved', 'active'] },
        user: activeUser,
      },
      select: { userId: true },
      take: 5000,
    });
    userIds = [...new Set(members.map((m) => m.userId))];
  } else if (input.audience === 'ministry') {
    if (!input.ministryId) return [];
    const rows = await db.memberMinistry.findMany({
      where: {
        ministryId: input.ministryId,
        status: 'active',
        member: { status: { in: ['approved', 'active'] }, user: activeUser },
      },
      select: { member: { select: { userId: true } } },
      take: 5000,
    });
    userIds = [...new Set(rows.map((r) => r.member.userId))];
  } else if (input.audience === 'ministry_leaders') {
    const ministries = await db.ministry.findMany({
      where: {
        leaderUserId: { not: null },
        ...(input.ministryId ? { id: input.ministryId } : {}),
      },
      select: { leaderUserId: true },
      take: 2000,
    });
    userIds = [
      ...new Set(
        ministries.map((m) => m.leaderUserId).filter((id): id is string => Boolean(id))
      ),
    ];
  } else if (input.audience === 'staff') {
    const users = await db.user.findMany({
      where: {
        ...activeUser,
        role: { slug: { in: [...ADMIN_PORTAL_ROLES] } },
      },
      select: { id: true },
      take: 2000,
    });
    userIds = users.map((u) => u.id);
  } else if (input.audience === 'volunteers') {
    const profiles = await db.volunteerProfile.findMany({
      where: {
        status: 'active',
        member: { user: activeUser },
      },
      select: { member: { select: { userId: true } } },
      take: 5000,
    });
    userIds = [...new Set(profiles.map((p) => p.member.userId))];
  } else if (input.audience === 'event_registrants') {
    if (!input.eventId) return [];
    const registrations = await db.eventRegistration.findMany({
      where: {
        eventId: input.eventId,
        status: { in: ['confirmed', 'registered'] },
        userId: { not: null },
        user: activeUser,
      },
      select: { userId: true },
      take: 5000,
    });
    userIds = [
      ...new Set(registrations.map((r) => r.userId).filter((id): id is string => Boolean(id))),
    ];
  } else if (input.eventId) {
    const attendees = await db.attendanceRecord.findMany({
      where: {
        status: { in: ['present', 'late', 'excused'] },
        session: { eventId: input.eventId },
        member: { user: activeUser },
      },
      select: { member: { select: { userId: true } } },
      take: 5000,
    });
    userIds = [...new Set(attendees.map((r) => r.member.userId))];
  }

  if (input.householdId) {
    const householdIds = await householdMemberUserIds(input.householdId);
    userIds = intersectHousehold(userIds, householdIds);
  }

  return userIds;
}
