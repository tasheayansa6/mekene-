import { db } from '@/lib/db';
import { success, tooManyRequests, validationError } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { sendVerificationEmail } from '@/lib/auth/email';
import { rateLimitResendVerification } from '@/lib/auth/rate-limit';
import { issueEmailVerificationToken } from '@/lib/auth/token-service';
import { formatZodErrors, resendVerificationSchema } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';

const GENERIC_MESSAGE =
  'If an account needs verification, a new email has been sent.';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const parsed = resendVerificationSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const ip = getClientIp(request);
  const limit = rateLimitResendVerification(parsed.data.email, ip);
  if (!limit.allowed) {
    return tooManyRequests(GENERIC_MESSAGE, limit.retryAfterSeconds);
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user && !user.isVerified && user.status !== 'deactivated') {
    const token = await issueEmailVerificationToken(user.id);
    await sendVerificationEmail({
      to: user.email,
      firstName: user.firstName,
      token,
    });
    await logSecurityEvent({
      action: 'verification_resent',
      entity: 'auth',
      userId: user.id,
      entityId: user.id,
      ipAddress: ip,
    });
  }

  return success({ sent: true }, GENERIC_MESSAGE);
}
