import { error, forbidden, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canVerifyMemberCards } from '@/lib/members/access';
import { verifyMemberCard } from '@/lib/members/card';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

const schema = z.object({
  token: z.string().trim().min(8).max(200),
});

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'members', 'view');
  if (!auth.ok) return auth.error;
  if (!canVerifyMemberCards(auth.user)) return forbidden();
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await verifyMemberCard(parsed.data.token);
  if (!result.ok) {
    return error(`Card verification failed (${result.reason}).`, 404);
  }
  return success(result.member, 'Member card verified.');
}
