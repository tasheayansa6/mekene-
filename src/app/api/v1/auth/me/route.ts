import { db } from '@/lib/db';
import { error, success, unauthorized, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { sendEmailChangeVerification } from '@/lib/auth/email';
import { getSessionUser, toAuthUser } from '@/lib/auth/session';
import { serializeUser } from '@/lib/auth/serialize';
import { issueEmailChangeToken } from '@/lib/auth/token-service';
import { formatZodErrors, updateMeSchema } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();

  if (user.status === 'suspended') {
    return error(
      'Your account has been suspended. Please contact the church office.',
      403
    );
  }
  if (user.status === 'deactivated') {
    return error('This account has been deactivated.', 403);
  }

  return success({ user: serializeUser(user) });
}

export async function PATCH(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = updateMeSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return validationError(formatZodErrors(parsed.error));
  }

  const data = parsed.data;
  const forbidden = ['role', 'roleId', 'status', 'isVerified', 'passwordHash'];
  for (const key of forbidden) {
    if (key in (data as Record<string, unknown>)) {
      return error('You cannot change this field.', 403);
    }
  }

  let pendingEmail: string | undefined;
  if (data.email && data.email !== auth.user.email) {
    const taken = await db.user.findUnique({ where: { email: data.email } });
    if (taken) {
      return error('That email address is not available.', 409);
    }
    pendingEmail = data.email;
    const token = await issueEmailChangeToken(auth.user.id);
    await sendEmailChangeVerification({
      to: data.email,
      firstName: auth.user.firstName,
      token,
    });
  }

  const updated = await db.user.update({
    where: { id: auth.user.id },
    data: {
      firstName: data.firstName ?? undefined,
      lastName: data.lastName ?? undefined,
      phone: data.phone === undefined ? undefined : data.phone,
      profileImage: data.profileImage === undefined ? undefined : data.profileImage,
      pendingEmail: pendingEmail ?? undefined,
    },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });

  return success(
    {
      user: serializeUser(toAuthUser(updated)),
      emailChangePending: Boolean(pendingEmail),
    },
    pendingEmail
      ? 'Profile updated. Please confirm your new email address.'
      : 'Profile updated.'
  );
}
