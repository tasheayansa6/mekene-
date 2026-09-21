import { forbidden, success } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { rejectIfCsrfInvalid } from '@/lib/auth/http';
import { markConversationRead } from '@/lib/communications/conversations';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const { id } = await context.params;
  try {
    await markConversationRead(id, auth.user.id);
    return success({ id, read: true }, 'Conversation marked as read.');
  } catch (err) {
    if (err instanceof Error && 'status' in err && (err as Error & { status: number }).status === 403) {
      return forbidden();
    }
    throw err;
  }
}
