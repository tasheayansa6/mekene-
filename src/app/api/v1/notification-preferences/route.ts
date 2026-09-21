import { success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { getOrCreatePreferences } from '@/lib/communications/audience';
import { emitCommunicationEvent } from '@/lib/communications/events';
import { z } from 'zod';
import { db } from '@/lib/db';

const preferenceSchema = z.object({
  emailAnnouncements: z.boolean().optional(),
  emailEvents: z.boolean().optional(),
  emailMinistry: z.boolean().optional(),
  emailMarketing: z.boolean().optional(),
  inAppGeneral: z.boolean().optional(),
  inAppEvents: z.boolean().optional(),
  inAppMembership: z.boolean().optional(),
  telegramEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
});

function serializePrefs(row: {
  emailAnnouncements: boolean;
  emailEvents: boolean;
  emailMinistry: boolean;
  emailMarketing: boolean;
  inAppGeneral: boolean;
  inAppEvents: boolean;
  inAppMembership: boolean;
  telegramEnabled: boolean;
  smsEnabled: boolean;
  updatedAt: Date;
}) {
  return {
    emailAnnouncements: row.emailAnnouncements,
    emailEvents: row.emailEvents,
    emailMinistry: row.emailMinistry,
    emailMarketing: row.emailMarketing,
    inAppGeneral: row.inAppGeneral,
    inAppEvents: row.inAppEvents,
    inAppMembership: row.inAppMembership,
    telegramEnabled: row.telegramEnabled,
    smsEnabled: row.smsEnabled,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;
  const prefs = await getOrCreatePreferences(auth.user.id);
  return success({ preferences: serializePrefs(prefs) });
}

export async function PATCH(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = preferenceSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  await getOrCreatePreferences(auth.user.id);
  const updated = await db.notificationPreference.update({
    where: { userId: auth.user.id },
    data: parsed.data,
  });

  await emitCommunicationEvent({
    type: 'communications.preferences_updated',
    userId: auth.user.id,
    entityId: updated.id,
    request,
    details: { fields: Object.keys(parsed.data) },
  });

  return success({ preferences: serializePrefs(updated) }, 'Notification preferences saved.');
}
