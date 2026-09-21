import { notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminWrite } from '@/lib/admin/guard';
import { reviewReport } from '@/lib/library/reports';
import { db } from '@/lib/db';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum(['reviewed', 'dismissed', 'actioned']),
});

async function guardMediaWrite(request: Request) {
  let auth = await guardAdminWrite(request, 'media', 'update');
  if (!auth.ok) auth = await guardAdminWrite(request, 'sermons', 'update');
  return auth;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardMediaWrite(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const existing = await db.mediaContentReport.findUnique({ where: { id } });
  if (!existing) return notFound('Report');

  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const report = await reviewReport({
    reportId: id,
    status: parsed.data.status,
    reviewedById: auth.user.id,
  });

  return success({
    report: {
      id: report.id,
      status: report.status,
      reviewedAt: report.reviewedAt?.toISOString() ?? null,
    },
  });
}
