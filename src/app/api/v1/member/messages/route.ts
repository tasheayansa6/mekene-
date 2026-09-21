import { z } from 'zod';
import { error, forbidden, paginated, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import {
  canStartSupportConversation,
} from '@/lib/communications/access';
import {
  createSupportConversation,
  listConversationsForUser,
} from '@/lib/communications/conversations';
import { serializeConversation } from '@/lib/communications/serialize';

const createSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(2000),
});

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const result = await listConversationsForUser(auth.user.id, { page, pageSize });
  return paginated(
    result.items.map(serializeConversation),
    { page: result.page, pageSize: result.pageSize, totalItems: result.total }
  );
}

export async function POST(request: Request) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;
  if (!canStartSupportConversation(auth.user)) return forbidden();

  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  try {
    const conversation = await createSupportConversation({
      memberUserId: auth.user.id,
      subject: parsed.data.subject,
      body: parsed.data.body,
    });
    return success(
      { conversation: serializeConversation(conversation) },
      'Support conversation started.',
      201
    );
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Unable to create conversation.', 400);
  }
}
