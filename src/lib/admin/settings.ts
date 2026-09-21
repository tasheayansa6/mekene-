import { db } from '@/lib/db';

export const SETTING_KEYS = {
  timezone: 'timezone',
  defaultLanguage: 'default_language',
  maintenanceMode: 'maintenance_mode',
  prayerGuestSubmission: 'prayer_guest_submission',
  prayerPublicIndex: 'prayer_public_index',
  prayerEmailConfirmation: 'prayer_email_confirmation',
  prayerRetentionDays: 'prayer_retention_days',
  membershipNumberPrefix: 'membership_number_prefix',
  receiptPrefix: 'receipt_prefix',
  givingDefaultMinAmount: 'giving_default_min_amount',
} as const;

export interface SystemSettings {
  timezone: string;
  defaultLanguage: string;
  maintenanceMode: boolean;
  prayerGuestSubmission: boolean;
  prayerPublicIndex: boolean;
  prayerEmailConfirmation: boolean;
  prayerRetentionDays: number | null;
  membershipNumberPrefix: string;
  receiptPrefix: string;
  givingDefaultMinAmount: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  timezone: 'Africa/Addis_Ababa',
  defaultLanguage: 'en',
  maintenanceMode: false,
  prayerGuestSubmission: true,
  prayerPublicIndex: false,
  prayerEmailConfirmation: false,
  prayerRetentionDays: null,
  membershipNumberPrefix: 'BME',
  receiptPrefix: 'BME-REC',
  givingDefaultMinAmount: '1.00',
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const rows = await db.churchSetting.findMany({
      where: {
        key: {
          in: Object.values(SETTING_KEYS),
        },
      },
    });
    const map = new Map(rows.map((row) => [row.key, row.value]));
    const retentionRaw = map.get(SETTING_KEYS.prayerRetentionDays);
    const retention = retentionRaw ? Number.parseInt(retentionRaw, 10) : NaN;
    return {
      timezone: String(map.get(SETTING_KEYS.timezone) || DEFAULT_SYSTEM_SETTINGS.timezone),
      defaultLanguage: String(
        map.get(SETTING_KEYS.defaultLanguage) || DEFAULT_SYSTEM_SETTINGS.defaultLanguage
      ),
      maintenanceMode: parseBoolean(
        map.get(SETTING_KEYS.maintenanceMode),
        DEFAULT_SYSTEM_SETTINGS.maintenanceMode
      ),
      prayerGuestSubmission: parseBoolean(
        map.get(SETTING_KEYS.prayerGuestSubmission),
        DEFAULT_SYSTEM_SETTINGS.prayerGuestSubmission
      ),
      prayerPublicIndex: parseBoolean(
        map.get(SETTING_KEYS.prayerPublicIndex),
        DEFAULT_SYSTEM_SETTINGS.prayerPublicIndex
      ),
      prayerEmailConfirmation: parseBoolean(
        map.get(SETTING_KEYS.prayerEmailConfirmation),
        DEFAULT_SYSTEM_SETTINGS.prayerEmailConfirmation
      ),
      prayerRetentionDays: Number.isFinite(retention) && retention > 0 ? retention : null,
      membershipNumberPrefix: String(
        map.get(SETTING_KEYS.membershipNumberPrefix) || DEFAULT_SYSTEM_SETTINGS.membershipNumberPrefix
      )
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase()
        .slice(0, 8) || DEFAULT_SYSTEM_SETTINGS.membershipNumberPrefix,
      receiptPrefix: String(
        map.get(SETTING_KEYS.receiptPrefix) || DEFAULT_SYSTEM_SETTINGS.receiptPrefix
      )
        .replace(/[^A-Za-z0-9-]/g, '')
        .toUpperCase()
        .slice(0, 16) || DEFAULT_SYSTEM_SETTINGS.receiptPrefix,
      givingDefaultMinAmount: String(
        map.get(SETTING_KEYS.givingDefaultMinAmount) ||
          DEFAULT_SYSTEM_SETTINGS.givingDefaultMinAmount
      ),
    };
  } catch {
    return { ...DEFAULT_SYSTEM_SETTINGS };
  }
}

export async function updateSystemSettings(
  patch: Partial<SystemSettings>
): Promise<SystemSettings> {
  const entries: Array<[string, string]> = [];
  if (patch.timezone !== undefined) {
    entries.push([SETTING_KEYS.timezone, patch.timezone]);
  }
  if (patch.defaultLanguage !== undefined) {
    entries.push([SETTING_KEYS.defaultLanguage, patch.defaultLanguage]);
  }
  if (patch.maintenanceMode !== undefined) {
    entries.push([SETTING_KEYS.maintenanceMode, patch.maintenanceMode ? 'true' : 'false']);
  }
  if (patch.prayerGuestSubmission !== undefined) {
    entries.push([SETTING_KEYS.prayerGuestSubmission, patch.prayerGuestSubmission ? 'true' : 'false']);
  }
  if (patch.prayerPublicIndex !== undefined) {
    entries.push([SETTING_KEYS.prayerPublicIndex, patch.prayerPublicIndex ? 'true' : 'false']);
  }
  if (patch.prayerEmailConfirmation !== undefined) {
    entries.push([
      SETTING_KEYS.prayerEmailConfirmation,
      patch.prayerEmailConfirmation ? 'true' : 'false',
    ]);
  }
  if (patch.prayerRetentionDays !== undefined) {
    entries.push([
      SETTING_KEYS.prayerRetentionDays,
      patch.prayerRetentionDays === null ? '' : String(patch.prayerRetentionDays),
    ]);
  }
  if (patch.membershipNumberPrefix !== undefined) {
    const prefix =
      patch.membershipNumberPrefix.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) ||
      DEFAULT_SYSTEM_SETTINGS.membershipNumberPrefix;
    entries.push([SETTING_KEYS.membershipNumberPrefix, prefix]);
  }
  if (patch.receiptPrefix !== undefined) {
    const prefix =
      patch.receiptPrefix.replace(/[^A-Za-z0-9-]/g, '').toUpperCase().slice(0, 16) ||
      DEFAULT_SYSTEM_SETTINGS.receiptPrefix;
    entries.push([SETTING_KEYS.receiptPrefix, prefix]);
  }
  if (patch.givingDefaultMinAmount !== undefined) {
    entries.push([SETTING_KEYS.givingDefaultMinAmount, patch.givingDefaultMinAmount]);
  }

  for (const [key, value] of entries) {
    await db.churchSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  return getSystemSettings();
}
