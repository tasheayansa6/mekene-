import { z } from 'zod';
import { db } from '@/lib/db';
import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canModerateMessages } from '@/lib/communications/access';

const patchSchema = z.object({
  status: z.enum(['reviewed', 'dismissed', 'actioned']),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await guardAdminWrite(request, 'communications', 'moderate');
  if (!auth.ok) return auth.error;
  if (!canModerateMessages(auth.user)) return forbidden();

  const { id } = await context.params;
  const existing = await db.messageReport.findUnique({ where: { id } });
  if (!existing) return notFound('Report');

  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const report = await db.messageReport.update({
    where: { id },
    data: {
      status: parsed.data.status,
      reviewedById: auth.user.id,
      reviewedAt: new Date(),
    },
  });

  return success({
    report: {
      id: report.id,
      status: report.status,
      reviewedAt: report.reviewedAt?.toISOString() ?? null,
    },
  });
}
