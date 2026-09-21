import { error, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { enforceAdminRateLimit } from '@/lib/admin/guard';
import { guardLiveAdminRead, guardLiveAdminWrite } from '@/lib/live/guard';
import { canModerateLiveChat } from '@/lib/live/access';
import { listAdminChatMessages, moderateChatMessage } from '@/lib/live/chat';
import { getLiveSessionById } from '@/lib/live/sessions';
import { liveChatModerationSchema, formatZodErrors } from '@/lib/live/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardLiveAdminRead(request);
  if (!auth.ok) return auth.error;
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-chat-list');
  if (limited) return limited;

  const { id } = await context.params;
  const session = await getLiveSessionById(id);
  if (!session) return notFound('Live session');

  const messages = await listAdminChatMessages(id);
  return success(messages);
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await guardLiveAdminWrite(request, 'moderate');
  if (!auth.ok) return auth.error;
  if (!canModerateLiveChat(auth.user)) {
    return error('You do not have permission to moderate live chat.', 403);
  }
  const limited = enforceAdminRateLimit(request, auth.user.id, 'live-chat-mod');
  if (limited) return limited;

  const { id } = await context.params;
  const session = await getLiveSessionById(id);
  if (!session) return notFound('Live session');

  const parsed = liveChatModerationSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const result = await moderateChatMessage({
    sessionId: id,
    messageId: parsed.data.messageId || '',
    action: parsed.data.action,
    moderatorId: auth.user.id,
    reason: parsed.data.reason,
    targetUserId: parsed.data.targetUserId,
  });

  if (!result.ok) return error(result.error, parsed.data.action === 'mute' ? 400 : 404);
  return success(null, 'Moderation action recorded.');
}
