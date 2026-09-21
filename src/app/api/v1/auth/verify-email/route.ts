import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { consumeAuthToken } from '@/lib/auth/token-service';
import { formatZodErrors, verifyEmailSchema } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const parsed = verifyEmailSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const consumed = await consumeAuthToken(parsed.data.token, 'email_verification');
  if (!consumed.ok) {
    const messages = {
      invalid: 'This verification link is invalid.',
      expired: 'This verification link has expired. Please request a new one.',
      used: 'This verification link has already been used.',
    };
    return error(messages[consumed.reason], 400);
  }

  const user = await db.user.findUnique({ where: { id: consumed.userId } });
  if (!user) return error('This verification link is invalid.', 400);

  await db.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      status: user.status === 'pending' ? 'active' : user.status,
    },
  });

  await logSecurityEvent({
    action: 'email_verified',
    entity: 'user',
    entityId: user.id,
    userId: user.id,
    ipAddress: getClientIp(request),
  });

  return success({ verified: true }, 'Email verified. You can now sign in.');
}
