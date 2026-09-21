import { db } from '@/lib/db';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { canManageAssignment } from '@/lib/volunteers/access';
import { formatZodErrors, substitutionApproveSchema } from '@/lib/volunteers/validation';
import { approveSubstitution, VolunteerWriteError } from '@/lib/volunteers/write';

export async function POST(request: Request) {
  const csrfError = rejectIfCsrfInvalid(request);
  if (csrfError) return csrfError;
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const body = (await readJson(request)) as Record<string, unknown>;
  const substitutionId = typeof body.substitutionId === 'string' ? body.substitutionId : '';
  const parsed = substitutionApproveSchema.safeParse(body);
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  if (!substitutionId) return validationError({ substitutionId: ['Required'] });

  const substitution = await db.volunteerSubstitution.findUnique({
    where: { id: substitutionId },
    include: {
      assignment: {
        include: {
          ministry: { select: { id: true, leaderUserId: true } },
          team: {
            include: { ministry: { select: { id: true, leaderUserId: true } } },
          },
        },
      },
    },
  });
  if (!substitution) return notFound('Substitution');
  if (!canManageAssignment(auth.user, substitution.assignment)) return forbidden();

  try {
    const result = await approveSubstitution({
      substitutionId,
      substituteMemberId: parsed.data.substituteMemberId,
      actorId: auth.user.id,
      request,
    });
    return success(result, 'Substitute assigned.');
  } catch (err) {
    if (err instanceof VolunteerWriteError) {
      return error(err.message, err.code === 'conflict' || err.code === 'ineligible' ? 409 : 400);
    }
    throw err;
  }
}
