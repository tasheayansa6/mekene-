import type { AnnouncementAudience, AppNotificationType } from '@prisma/client';
import { db } from '@/lib/db';
import { allowsChannel, resolveAudienceUserIds } from './audience';

export type AudiencePreviewInput = {
  audience: AnnouncementAudience;
  ministryId?: string | null;
  eventId?: string | null;
  householdId?: string | null;
  channels: Array<'in_app' | 'email' | 'telegram' | 'sms'>;
  notificationType?: AppNotificationType;
  transactional?: boolean;
};

export type AudiencePreviewResult = {
  recipientCount: number;
  channels: {
    in_app: number;
    email: number;
    telegram: number;
    sms: number;
  };
};

export async function previewAudience(input: AudiencePreviewInput): Promise<AudiencePreviewResult> {
  const userIds = await resolveAudienceUserIds({
    audience: input.audience,
    ministryId: input.ministryId,
    eventId: input.eventId,
    householdId: input.householdId,
  });

  const counts = { in_app: 0, email: 0, telegram: 0, sms: 0 };
  if (userIds.length === 0) {
    return { recipientCount: 0, channels: counts };
  }

  const type = input.notificationType ?? 'announcement';
  const transactional = Boolean(input.transactional);
  const requested = new Set(input.channels);

  const [prefsRows, usersWithPhone] = await Promise.all([
    db.notificationPreference.findMany({
      where: { userId: { in: userIds } },
    }),
    requested.has('sms')
      ? db.user.findMany({
          where: { id: { in: userIds }, phone: { not: null } },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);

  const prefsByUser = new Map(prefsRows.map((p) => [p.userId, p]));
  const phones = new Set(usersWithPhone.map((u) => u.id));

  for (const userId of userIds) {
    const prefs = prefsByUser.get(userId) ?? {
      id: '',
      userId,
      emailAnnouncements: true,
      emailEvents: true,
      emailMinistry: true,
      emailMarketing: false,
      inAppGeneral: true,
      inAppEvents: true,
      inAppMembership: true,
      telegramEnabled: false,
      smsEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (requested.has('in_app') && allowsChannel(prefs, type, 'in_app', transactional)) {
      counts.in_app += 1;
    }
    if (requested.has('email') && allowsChannel(prefs, type, 'email', transactional)) {
      counts.email += 1;
    }
    if (requested.has('telegram') && allowsChannel(prefs, type, 'telegram', transactional)) {
      counts.telegram += 1;
    }
    if (
      requested.has('sms') &&
      phones.has(userId) &&
      allowsChannel(prefs, type, 'sms', transactional)
    ) {
      counts.sms += 1;
    }
  }

  return { recipientCount: userIds.length, channels: counts };
}
