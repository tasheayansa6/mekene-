import { db } from '@/lib/db';
import { success, tooManyRequests, validationError } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { sendPasswordResetEmail } from '@/lib/auth/email';
import { rateLimitForgotPassword } from '@/lib/auth/rate-limit';
import { issuePasswordResetToken } from '@/lib/auth/token-service';
import { formatZodErrors, forgotPasswordSchema } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';

const GENERIC_MESSAGE =
  'If an account exists for this email, password reset instructions have been sent.';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const parsed = forgotPasswordSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const ip = getClientIp(request);
  const limit = rateLimitForgotPassword(parsed.data.email, ip);
  if (!limit.allowed) {
    return tooManyRequests(GENERIC_MESSAGE, limit.retryAfterSeconds);
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  if (user && user.status !== 'deactivated') {
    const token = await issuePasswordResetToken(user.id);
    await sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      token,
    });
    await logSecurityEvent({
      action: 'password_reset_requested',
      entity: 'auth',
      entityId: user.id,
      userId: user.id,
      ipAddress: ip,
    });
  } else {
    await logSecurityEvent({
      action: 'password_reset_requested',
      entity: 'auth',
      ipAddress: ip,
      details: { result: 'generic' },
    });
  }

  return success({ sent: true }, GENERIC_MESSAGE);
}
