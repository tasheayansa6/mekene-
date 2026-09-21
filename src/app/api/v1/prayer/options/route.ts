import { db } from '@/lib/db';
import { success } from '@/lib/api/response';
import { getSystemSettings } from '@/lib/admin/settings';
import { captchaProvider, captchaRequired, captchaSiteKey } from '@/lib/prayer/captcha';

export async function GET() {
  const settings = await getSystemSettings();
  const categories = await db.prayerCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true },
  });
  return success({
    guestSubmissionEnabled: settings.prayerGuestSubmission,
    publicIndexEnabled: settings.prayerPublicIndex,
    captcha: captchaRequired()
      ? { provider: captchaProvider(), siteKey: captchaSiteKey() }
      : null,
    categories,
    privacyNotice:
      'Prayer requests may be viewed by authorized members of the church prayer team. Please do not include information you do not want shared with the prayer team.',
  });
}
