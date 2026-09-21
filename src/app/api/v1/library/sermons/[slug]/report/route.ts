import { db } from '@/lib/db';
import { notFound, success, validationError } from '@/lib/api/response';
import { optionalAuth } from '@/lib/auth/authorize';
import { readJson } from '@/lib/auth/http';
import { isPubliclyVisible } from '@/lib/content/status';
import { createMediaReport } from '@/lib/library/reports';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

type RouteContext = { params: Promise<{ slug: string }> };

const reportSchema = z.object({
  reason: z.string().min(3).max(200),
  details: z.string().max(2000).optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const parsed = reportSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const sermon = await db.sermon.findUnique({ where: { slug } });
  if (!sermon || !isPubliclyVisible(sermon)) return notFound('Sermon');

  const { user } = await optionalAuth(request);
  const report = await createMediaReport({
    sermonId: sermon.id,
    reason: parsed.data.reason,
    details: parsed.data.details,
    reporterId: user?.id,
  });

  return success(
    {
      report: {
        id: report.id,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
      },
    },
    'Report submitted.',
    201
  );
}
