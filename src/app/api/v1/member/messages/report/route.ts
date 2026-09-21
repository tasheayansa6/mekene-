import { z } from 'zod';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { reportMessage } from '@/lib/communications/conversations';

const reportSchema = z.object({
  messageId: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(500),
});

export async function POST(request: Request) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = reportSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  try {
    const report = await reportMessage({
      messageId: parsed.data.messageId,
      reporterId: auth.user.id,
      reason: parsed.data.reason,
    });
    return success(
      {
        report: {
          id: report.id,
          messageId: report.messageId,
          status: report.status,
          createdAt: report.createdAt.toISOString(),
        },
      },
      'Report submitted.',
      201
    );
  } catch (err) {
    if (err instanceof Error && err.message === 'Message not found') {
      return notFound('Message');
    }
    if (err instanceof Error && 'status' in err && (err as Error & { status: number }).status === 403) {
      return forbidden();
    }
    return error(err instanceof Error ? err.message : 'Unable to submit report.', 400);
  }
}
