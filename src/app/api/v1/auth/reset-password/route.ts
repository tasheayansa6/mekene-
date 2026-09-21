import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { sendPasswordChangedEmail } from '@/lib/auth/email';
import { hashPassword, validatePasswordPolicy } from '@/lib/auth/password';
import { revokeAllUserSessions } from '@/lib/auth/session';
import { consumeAuthToken } from '@/lib/auth/token-service';
import { formatZodErrors, resetPasswordSchema } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const parsed = resetPasswordSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const consumed = await consumeAuthToken(parsed.data.token, 'password_reset');
  if (!consumed.ok) {
    const messages = {
      invalid: 'This reset link is invalid.',
      expired: 'This reset link has expired. Please request a new one.',
      used: 'This reset link has already been used.',
    };
    return error(messages[consumed.reason], 400);
  }

  const user = await db.user.findUnique({ where: { id: consumed.userId } });
  if (!user) return error('This reset link is invalid.', 400);

  const policy = validatePasswordPolicy(parsed.data.password, {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  });
  if (!policy.ok) {
    return validationError({ password: policy.errors });
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      lockedUntil: null,
    },
  });

  await revokeAllUserSessions(user.id);
  await sendPasswordChangedEmail({ to: user.email, firstName: user.firstName });

  await logSecurityEvent({
    action: 'password_changed',
    entity: 'auth',
    entityId: user.id,
    userId: user.id,
    ipAddress: getClientIp(request),
  });

  return success(
    { reset: true },
    'Password updated. You can now sign in with your new password.'
  );
}
