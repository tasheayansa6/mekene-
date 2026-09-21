import { error, forbidden, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { canMergeMembers } from '@/lib/members/access';
import { MergeError, mergeMembers, previewMemberMerge } from '@/lib/members/merge';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

const schema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  confirm: z.boolean().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'members', 'manage');
  if (!auth.ok) return auth.error;
  if (!canMergeMembers(auth.user)) return forbidden();

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  try {
    const preview = await previewMemberMerge(parsed.data.sourceId, parsed.data.targetId);
    if (!parsed.data.confirm) {
      return success({ preview, requiresConfirmation: true });
    }
    await mergeMembers({
      sourceId: parsed.data.sourceId,
      targetId: parsed.data.targetId,
      performedById: auth.user.id,
      notes: parsed.data.notes,
      request,
    });
    return success({ preview, merged: true }, 'Members merged. Source archived.');
  } catch (err) {
    if (err instanceof MergeError) {
      return error(err.message, err.code === 'not_found' ? 404 : 400);
    }
    throw err;
  }
}
