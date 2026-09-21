import { db } from '@/lib/db';
import { success, validationError } from '@/lib/api/response';
import { getSystemSettings, updateSystemSettings } from '@/lib/admin/settings';
import { formatZodErrors, settingsPatchSchema } from '@/lib/admin/validation';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { readJson } from '@/lib/auth/http';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'settings', 'view');
  if (!auth.ok) return auth.error;

  const profile = await db.churchProfile.findFirst({
    select: { name: true, description: true, email: true, language: true },
  });
  const settings = await getSystemSettings();

  return success({
    siteName: profile?.name || null,
    siteDescription: profile?.description || null,
    contactEmail: profile?.email || null,
    churchLanguage: profile?.language || null,
    timezone: settings.timezone,
    defaultLanguage: settings.defaultLanguage,
    maintenanceMode: settings.maintenanceMode,
    prayerGuestSubmission: settings.prayerGuestSubmission,
    prayerPublicIndex: settings.prayerPublicIndex,
    prayerEmailConfirmation: settings.prayerEmailConfirmation,
    prayerRetentionDays: settings.prayerRetentionDays,
    membershipNumberPrefix: settings.membershipNumberPrefix,
  });
}

export async function PATCH(request: Request) {
  const auth = await guardAdminWrite(request, 'settings', 'manage');
  if (!auth.ok) return auth.error;

  const parsed = settingsPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const settings = await updateSystemSettings(parsed.data);

  await logSecurityEvent({
    action: 'update',
    entity: 'settings',
    userId: auth.user.id,
    ipAddress: getClientIp(request),
    details: parsed.data,
  });

  const profile = await db.churchProfile.findFirst({
    select: { name: true, description: true, email: true, language: true },
  });

  return success(
    {
      siteName: profile?.name || null,
      siteDescription: profile?.description || null,
      contactEmail: profile?.email || null,
      churchLanguage: profile?.language || null,
      ...settings,
    },
    'Settings updated.'
  );
}
