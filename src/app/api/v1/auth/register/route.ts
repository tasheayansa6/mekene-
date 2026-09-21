import { db } from '@/lib/db';
import {
  error,
  success,
  tooManyRequests,
  validationError,
} from '@/lib/api/response';
import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { rateLimitRegister } from '@/lib/auth/rate-limit';
import { hashPassword, validatePasswordPolicy } from '@/lib/auth/password';
import { sendVerificationEmail } from '@/lib/auth/email';
import { issueEmailVerificationToken } from '@/lib/auth/token-service';
import { formatZodErrors, registerSchema } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request);
  const limit = rateLimitRegister(ip);
  if (!limit.allowed) {
    return tooManyRequests(
      'Too many registration attempts. Please try again later.',
      limit.retryAfterSeconds
    );
  }

  const parsed = registerSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const { firstName, lastName, email, password, phone } = parsed.data;
  const policy = validatePasswordPolicy(password, { email, firstName, lastName });
  if (!policy.ok) {
    return validationError({ password: policy.errors });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return error('An account with this email already exists. Try signing in instead.', 409);
  }

  const memberRole = await db.role.findUnique({ where: { slug: 'member' } });
  if (!memberRole) {
    return error('Registration is temporarily unavailable. Please try again later.', 500);
  }

  const user = await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      firstName,
      lastName,
      phone: phone || null,
      status: 'pending',
      isVerified: false,
      roleId: memberRole.id,
    },
  });

  const token = await issueEmailVerificationToken(user.id);
  await sendVerificationEmail({ to: user.email, firstName: user.firstName, token });

  await logSecurityEvent({
    action: 'register',
    entity: 'user',
    entityId: user.id,
    userId: user.id,
    ipAddress: ip,
    details: { email: user.email },
  });

  return success(
    { email: user.email, verificationRequired: true },
    'Account created. Please check your email to verify your address.',
    201
  );
}
