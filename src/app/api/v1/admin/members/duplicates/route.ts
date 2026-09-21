import { success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead } from '@/lib/admin/guard';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';
import { findPossibleDuplicateMembers } from '@/lib/members/duplicates';

const schema = z.object({
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  firstName: z.string().trim().max(80).optional().nullable(),
  lastName: z.string().trim().max(80).optional().nullable(),
  membershipNumber: z.string().trim().max(40).optional().nullable(),
  excludeMemberId: z.string().min(1).optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await guardAdminRead(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const candidates = await findPossibleDuplicateMembers(parsed.data);
  return success({
    message: candidates.length ? 'Possible existing member found.' : 'No duplicates detected.',
    candidates,
  });
}
