import { db } from '@/lib/db';
import { getLiveNow } from '@/lib/live/public';
import type { AuthUser } from '@/lib/auth/permissions';
import { canAccessAdminPortal } from '@/lib/auth/permissions';
import { moneyToString, netContributionAmount } from '@/lib/giving/money';
import { Decimal } from '@prisma/client/runtime/library';
import { memberAnnouncementWhere } from './announcements';

export function profileCompletion(input: {
  hasPhoto: boolean;
  preferredLanguage: string | null;
  emergencyContactName: string | null;
  directoryVisibility: string | null;
}): { percent: number; missing: string[] } {
  const checks: Array<{ ok: boolean; label: string }> = [
    { ok: input.hasPhoto, label: 'Profile photo' },
    { ok: Boolean(input.preferredLanguage), label: 'Preferred language' },
    { ok: Boolean(input.emergencyContactName), label: 'Emergency contact' },
    { ok: Boolean(input.directoryVisibility), label: 'Directory privacy' },
  ];
  const missing = checks.filter((item) => !item.ok).map((item) => item.label);
  const percent = Math.round(((checks.length - missing.length) / checks.length) * 100);
  return { percent, missing };
}

export async function getMemberDashboard(user: AuthUser) {
  const now = new Date();
  const member = await db.member.findUnique({
    where: { userId: user.id },
    include: {
      ministries: {
        where: { status: 'active' },
        take: 5,
        include: { ministry: { select: { name: true, slug: true } } },
      },
    },
  });

  const completion = profileCompletion({
    hasPhoto: Boolean(user.profileImage),
    preferredLanguage: member?.preferredLanguage || null,
    emergencyContactName: member?.emergencyContactName || null,
    directoryVisibility: member?.directoryVisibility || null,
  });

  const announcementWhere = memberAnnouncementWhere({
    now,
    ministryIds: member?.ministries.map((row) => row.ministry.id) || [],
    includeStaff: canAccessAdminPortal(user),
  });

  const [
    liveNow,
    nextEvents,
    announcements,
    contributions,
    prayers,
    unread,
    savedCount,
    bookmarks,
  ] = await Promise.all([
    getLiveNow(user),
    db.event.findMany({
      where: {
        status: 'published',
        endAt: { gte: now },
      },
      select: {
        title: true,
        slug: true,
        startAt: true,
        isWorshipService: true,
        isOnline: true,
      },
      orderBy: { startAt: 'asc' },
      take: 5,
    }),
    db.announcement.findMany({
      where: announcementWhere,
      select: { id: true, title: true, slug: true, priority: true, startAt: true },
      orderBy: [{ priority: 'desc' }, { startAt: 'desc' }],
      take: 5,
    }),
    db.contribution.findMany({
      where: {
        userId: user.id,
        status: { in: ['successful', 'partially_refunded'] },
      },
      select: {
        id: true,
        amount: true,
        refundedAmount: true,
        currency: true,
        createdAt: true,
        receiptNumber: true,
        reference: true,
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.prayerRequest.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    db.appNotification.count({
      where: { userId: user.id, readAt: null },
    }),
    db.savedItem.count({ where: { userId: user.id } }),
    db.sermonBookmark.findMany({
      where: { userId: user.id },
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: {
        sermon: { select: { title: true, slug: true, status: true } },
      },
    }),
  ]);

  const reads = announcements.length
    ? await db.announcementRead.findMany({
        where: {
          userId: user.id,
          announcementId: { in: announcements.map((row) => row.id) },
        },
        select: { announcementId: true },
      })
    : [];
  const readSet = new Set(reads.map((row) => row.announcementId));

  const givingTotal = contributions.reduce(
    (sum, row) => sum.plus(netContributionAmount(row.amount, row.refundedAmount)),
    new Decimal(0)
  );

  const nextService = nextEvents.find((row) => row.isWorshipService) || nextEvents[0] || null;

  return {
    welcome: {
      firstName: user.firstName,
      displayName: member?.displayName || user.firstName,
    },
    member: member
      ? {
          status: member.status,
          membershipNumber: member.membershipNumber,
        }
      : null,
    profileCompletion: completion,
    liveNow: liveNow?.isLive
      ? { title: liveNow.title, slug: liveNow.slug, isLive: true }
      : null,
    nextService: nextService
      ? {
          title: nextService.title,
          slug: nextService.slug,
          startAt: nextService.startAt.toISOString(),
          isWorship: nextService.isWorshipService,
          isOnline: nextService.isOnline,
        }
      : null,
    upcomingEvents: nextEvents.map((row) => ({
      title: row.title,
      slug: row.slug,
      startAt: row.startAt.toISOString(),
      isWorship: row.isWorshipService,
      isOnline: row.isOnline,
    })),
    announcements: announcements.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      priority: row.priority,
      startAt: row.startAt.toISOString(),
      read: readSet.has(row.id),
    })),
    giving: {
      recentCount: contributions.length,
      total: moneyToString(givingTotal),
      currency: contributions[0]?.currency || 'ETB',
      recent: contributions.map((row) => ({
        id: row.id,
        amount: moneyToString(netContributionAmount(row.amount, row.refundedAmount)),
        currency: row.currency,
        createdAt: row.createdAt.toISOString(),
        fund: row.category?.name || 'Gift',
        reference: row.reference,
        receiptNumber: row.receiptNumber,
      })),
    },
    prayer: prayers.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
    ministries:
      member?.ministries.map((row) => ({
        name: row.ministry.name,
        slug: row.ministry.slug,
      })) || [],
    unreadNotifications: unread,
    savedCount,
    savedSermons: bookmarks
      .filter((row) => row.sermon.status === 'published')
      .map((row) => ({
        title: row.sermon.title,
        slug: row.sermon.slug,
      })),
  };
}
