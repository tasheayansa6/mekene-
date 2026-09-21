import { db } from '@/lib/db';
import { forbidden, success, tooManyRequests, validationError } from '@/lib/api/response';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';
import { readJson } from '@/lib/auth/http';
import { getClientIp } from '@/lib/auth/audit';
import { rateLimitKey } from '@/lib/auth/rate-limit';
import { getSessionUser } from '@/lib/auth/session';
import { getSystemSettings } from '@/lib/admin/settings';
import { formatZodErrors, prayerSubmitSchema } from '@/lib/prayer/validation';
import { createPrayerRequest } from '@/lib/prayer/write';
import { logPrayerAudit } from '@/lib/prayer/audit';
import { sendPrayerReceivedEmail } from '@/lib/prayer/email';
import { captchaRequired, verifyCaptchaToken } from '@/lib/prayer/captcha';
import { serializeMemberPrayer } from '@/lib/prayer/serialize';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request);
  const user = await getSessionUser(request);
  const settings = await getSystemSettings();

  if (user && (user.status === 'suspended' || user.status === 'deactivated')) {
    return forbidden('This account cannot submit prayer requests.');
  }

  if (!user && !settings.prayerGuestSubmission) {
    return forbidden('Sign in to submit a prayer request, or contact the church office.');
  }

  const limitKey = user ? `prayer:submit:user:${user.id}` : `prayer:submit:ip:${ip}`;
  const limited = rateLimitKey(limitKey, 5, 60 * 60 * 1000);
  if (!limited.allowed) {
    return tooManyRequests(
      'You have submitted several prayer requests recently. Please wait before sending another.',
      limited.retryAfterSeconds
    );
  }
  const ipLimited = rateLimitKey(`prayer:submit:ip:${ip}`, 8, 60 * 60 * 1000);
  if (!ipLimited.allowed) {
    return tooManyRequests(
      'Too many prayer requests from this network. Please wait and try again.',
      ipLimited.retryAfterSeconds
    );
  }

  const parsed = prayerSubmitSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (parsed.data.website) {
    return success(
      { received: true },
      'Your prayer request has been received. Thank you for allowing us to pray with you.'
    );
  }

  if (captchaRequired()) {
    const ok = await verifyCaptchaToken(parsed.data.captchaToken, ip);
    if (!ok) {
      return forbidden('Please complete the verification step and try again.');
    }
  }

  const row = await createPrayerRequest({
    title: parsed.data.title,
    content: parsed.data.content,
    categoryId: parsed.data.categoryId,
    isAnonymous: parsed.data.isAnonymous,
    visibility: parsed.data.visibility,
    userId: user?.id ?? null,
    guestName: parsed.data.name,
    guestEmail: parsed.data.email,
  });

  await logPrayerAudit({
    type: 'prayer_request.created',
    requestId: row.id,
    userId: user?.id ?? null,
    request,
    details: {
      status: row.status,
      visibility: row.visibility,
      isAnonymous: row.isAnonymous,
      guest: !user,
    },
  });

  if (settings.prayerEmailConfirmation) {
    const to = user?.email || row.guestEmail;
    if (to) {
      await sendPrayerReceivedEmail({
        to,
        firstName: user?.firstName || parsed.data.name || null,
      });
    }
  }

  return success(
    user
      ? serializeMemberPrayer(row)
      : { received: true },
    'Your prayer request has been received. Thank you for allowing us to pray with you.',
    201
  );
}
