import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { hashPassword, validatePasswordPolicy, verifyPassword } from '@/lib/auth/password';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { getSessionTokenFromRequest } from '@/lib/auth/cookies';
import { revokeOtherUserSessions } from '@/lib/auth/session';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

export async function POST(request: Request) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const record = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { passwordHash: true, email: true, firstName: true, lastName: true },
  });
  if (!record) return error('Account not found.', 404);

  const ok = await verifyPassword(parsed.data.currentPassword, record.passwordHash);
  if (!ok) {
    await logSecurityEvent({
      action: 'password_change_failed',
      entity: 'auth',
      userId: auth.user.id,
      entityId: auth.user.id,
      ipAddress: getClientIp(request),
    });
    return error('Current password is incorrect.', 403);
  }

  const policy = validatePasswordPolicy(parsed.data.newPassword, {
    email: record.email,
    firstName: record.firstName,
    lastName: record.lastName,
  });
  if (!policy.ok) return validationError({ newPassword: policy.errors });

  await db.user.update({
    where: { id: auth.user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  const token = getSessionTokenFromRequest(request);
  if (token) {
    await revokeOtherUserSessions(auth.user.id, token);
  }

  await logSecurityEvent({
    action: 'password_changed',
    entity: 'auth',
    userId: auth.user.id,
    entityId: auth.user.id,
    ipAddress: getClientIp(request),
  });

  return success({ updated: true }, 'Password updated. Other sessions were signed out.');
}
