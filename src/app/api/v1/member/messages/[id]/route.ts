import { z } from 'zod';
import { error, forbidden, notFound, success, validationError } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import {
  getConversationForUser,
  markConversationRead,
  postMessage,
} from '@/lib/communications/conversations';
import { serializeConversation, serializeMessage } from '@/lib/communications/serialize';

const postSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  try {
    const conversation = await getConversationForUser(id, auth.user.id);
    if (!conversation) return notFound('Conversation');
    return success({ conversation: serializeConversation(conversation) });
  } catch (err) {
    if (err instanceof Error && 'status' in err && (err as Error & { status: number }).status === 403) {
      return forbidden();
    }
    throw err;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  const parsed = postSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  try {
    const message = await postMessage({
      conversationId: id,
      senderId: auth.user.id,
      body: parsed.data.body,
    });
    return success({ message: serializeMessage(message) }, 'Message sent.', 201);
  } catch (err) {
    if (err instanceof Error && 'status' in err && (err as Error & { status: number }).status === 403) {
      return forbidden();
    }
    return error(err instanceof Error ? err.message : 'Unable to send message.', 400);
  }
}
