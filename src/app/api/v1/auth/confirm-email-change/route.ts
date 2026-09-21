import { db } from '@/lib/db';
import { error, success } from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { consumeAuthToken } from '@/lib/auth/token-service';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

const schema = z.object({
  token: z.string().min(16),
});

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return error('This confirmation link is invalid.', 400);
  }

  const consumed = await consumeAuthToken(parsed.data.token, 'email_change');
  if (!consumed.ok) {
    return error('This confirmation link is invalid or has expired.', 400);
  }

  const user = await db.user.findUnique({ where: { id: consumed.userId } });
  if (!user?.pendingEmail) {
    return error('This confirmation link is invalid.', 400);
  }

  const taken = await db.user.findUnique({ where: { email: user.pendingEmail } });
  if (taken) {
    return error('That email address is no longer available.', 409);
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      email: user.pendingEmail,
      pendingEmail: null,
      isVerified: true,
    },
  });

  await logSecurityEvent({
    action: 'email_changed',
    entity: 'user',
    userId: user.id,
    entityId: user.id,
    ipAddress: getClientIp(request),
  });

  return success({ updated: true }, 'Email address updated.');
}
