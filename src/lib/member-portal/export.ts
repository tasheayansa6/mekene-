import { db } from '@/lib/db';
import type { AuthUser } from '@/lib/auth/permissions';
import { moneyToString, netContributionAmount } from '@/lib/giving/money';

export async function exportMemberData(user: AuthUser) {
  const member = await db.member.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      membershipNumber: true,
      displayName: true,
      preferredLanguage: true,
      status: true,
      directoryVisibility: true,
      showProfilePhoto: true,
      showDisplayName: true,
      showMinistry: true,
      showContactButton: true,
      dateJoined: true,
    },
  });

  const [contributions, prayers, attendance, registrations, notifications] = await Promise.all([
    db.contribution.findMany({
      where: { userId: user.id },
      select: {
        reference: true,
        receiptNumber: true,
        amount: true,
        refundedAmount: true,
        currency: true,
        status: true,
        createdAt: true,
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    db.prayerRequest.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, status: true, visibility: true, createdAt: true },
      take: 200,
    }),
    member
      ? db.attendanceRecord.findMany({
          where: { memberId: member.id },
          select: {
            checkInAt: true,
            session: { select: { title: true, sessionType: true, startsAt: true } },
          },
          take: 200,
          orderBy: { checkInAt: 'desc' },
        })
      : [],
    db.eventRegistration.findMany({
      where: { userId: user.id },
      select: {
        reference: true,
        status: true,
        event: { select: { title: true, slug: true, startAt: true } },
      },
      take: 200,
    }),
    db.appNotification.findMany({
      where: { userId: user.id },
      select: { title: true, type: true, createdAt: true, readAt: true },
      take: 100,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    },
    membership: member,
    giving: contributions.map((row) => ({
      reference: row.reference,
      receiptNumber: row.receiptNumber,
      amount: moneyToString(netContributionAmount(row.amount, row.refundedAmount)),
      currency: row.currency,
      status: row.status,
      fund: row.category?.name || null,
      createdAt: row.createdAt.toISOString(),
    })),
    prayer: prayers.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      visibility: row.visibility,
      createdAt: row.createdAt.toISOString(),
    })),
    attendance: attendance.map((row) => ({
      checkedInAt: row.checkInAt?.toISOString() ?? null,
      session: row.session.title,
      type: row.session.sessionType,
    })),
    events: registrations.map((row) => ({
      reference: row.reference,
      status: row.status,
      title: row.event.title,
      slug: row.event.slug,
    })),
    notifications: notifications.map((row) => ({
      title: row.title,
      type: row.type,
      createdAt: row.createdAt.toISOString(),
      read: Boolean(row.readAt),
    })),
  };
}
