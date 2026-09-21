import { error, forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canManageCampaigns, canViewGiving } from '@/lib/giving/access';
import { givingSettingsPatchSchema } from '@/lib/giving/validation';
import {
  formatCurrencyList,
  getGivingSettings,
} from '@/lib/giving/currency';
import { db } from '@/lib/db';
import { emitGivingEvent } from '@/lib/giving/events';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'finance', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGiving(auth.user)) return forbidden();

  const settings = await getGivingSettings();
  return success({
    settings: {
      ...settings,
      supportedCurrencies: settings.supportedCurrencies.split(',').map((c) => c.trim()),
      updatedAt: settings.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await guardAdminWrite(request, 'finance', 'manage');
  if (!auth.ok) return auth.error;
  if (!canManageCampaigns(auth.user)) return forbidden();

  const parsed = givingSettingsPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  await getGivingSettings();
  const updated = await db.churchGivingSettings.update({
    where: { id: 'default' },
    data: {
      ...(parsed.data.givingYearStartMonth !== undefined
        ? { givingYearStartMonth: parsed.data.givingYearStartMonth }
        : {}),
      ...(parsed.data.supportedCurrencies !== undefined
        ? { supportedCurrencies: formatCurrencyList(parsed.data.supportedCurrencies) }
        : {}),
      ...(parsed.data.defaultCurrency !== undefined
        ? { defaultCurrency: parsed.data.defaultCurrency }
        : {}),
      ...(parsed.data.legalChurchName !== undefined
        ? { legalChurchName: parsed.data.legalChurchName }
        : {}),
      ...(parsed.data.registrationInfo !== undefined
        ? { registrationInfo: parsed.data.registrationInfo }
        : {}),
      ...(parsed.data.donationTerms !== undefined
        ? { donationTerms: parsed.data.donationTerms }
        : {}),
      ...(parsed.data.refundPolicyNote !== undefined
        ? { refundPolicyNote: parsed.data.refundPolicyNote }
        : {}),
      ...(parsed.data.privacyNote !== undefined ? { privacyNote: parsed.data.privacyNote } : {}),
    },
  });

  await emitGivingEvent({
    type: 'giving.settings_updated',
    entityId: updated.id,
    userId: auth.user.id,
    request,
  });

  return success({ settings: updated }, 'Giving settings updated.');
}
