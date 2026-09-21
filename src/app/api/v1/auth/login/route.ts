import { db } from '@/lib/db';
import {
  error,
  success,
  tooManyRequests,
  validationError,
} from '@/lib/api/response';
import { getClientIp, getUserAgent, logSecurityEvent } from '@/lib/auth/audit';
import {
  clearLoginRateLimit,
  rateLimitLogin,
} from '@/lib/auth/rate-limit';
import { dummyPasswordCheck, verifyPassword } from '@/lib/auth/password';
import { createSession, toAuthUser } from '@/lib/auth/session';
import { serializeUser } from '@/lib/auth/serialize';
import { formatZodErrors, loginSchema } from '@/lib/auth/validation';
import { userInclude } from '@/lib/auth/session';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { setSessionCookie } from '@/lib/auth/cookies';
import { SESSION_TTL_SECONDS } from '@/lib/auth/config';

const GENERIC_INVALID = 'Invalid email or password.';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request);
  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const { email, password, rememberMe } = parsed.data;
  const limit = rateLimitLogin(email, ip);
  if (!limit.allowed) {
    await logSecurityEvent({
      action: 'login_failed',
      entity: 'auth',
      ipAddress: ip,
      details: { email, reason: 'rate_limited' },
    });
    return tooManyRequests(
      'Too many sign-in attempts. Please try again later.',
      limit.retryAfterSeconds
    );
  }

  const user = await db.user.findUnique({
    where: { email },
    include: userInclude,
  });

  if (!user) {
    await dummyPasswordCheck();
    await logSecurityEvent({
      action: 'login_failed',
      entity: 'auth',
      ipAddress: ip,
      details: { email, reason: 'invalid_credentials' },
    });
    return error(GENERIC_INVALID, 401);
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await dummyPasswordCheck();
    return tooManyRequests(
      'Too many sign-in attempts. Please try again later.',
      Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000)
    );
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    await logSecurityEvent({
      action: 'login_failed',
      entity: 'auth',
      entityId: user.id,
      userId: user.id,
      ipAddress: ip,
      details: { reason: 'invalid_credentials' },
    });
    return error(GENERIC_INVALID, 401);
  }

  if (!user.isVerified || user.status === 'pending') {
    return error(
      'Please verify your email address before signing in. Check your inbox for the verification link.',
      403
    );
  }

  if (user.status === 'suspended') {
    return error(
      'Your account has been suspended. Please contact the church office.',
      403
    );
  }

  if (user.status === 'deactivated') {
    return error('This account has been deactivated.', 403);
  }

  const session = await createSession({
    userId: user.id,
    rememberMe,
    ipAddress: ip,
    userAgent: getUserAgent(request),
  });

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lockedUntil: null },
  });

  clearLoginRateLimit(email);

  await logSecurityEvent({
    action: 'login_success',
    entity: 'auth',
    entityId: user.id,
    userId: user.id,
    ipAddress: ip,
  });

  const authUser = toAuthUser({ ...user, lastLoginAt: new Date() });
  const response = success({ user: serializeUser(authUser) }, 'Signed in successfully');
  setSessionCookie(
    response,
    session.token,
    rememberMe ? session.maxAgeSeconds : SESSION_TTL_SECONDS
  );
  return response;
}
