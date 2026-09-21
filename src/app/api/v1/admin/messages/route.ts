import { forbidden, paginated } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canAccessStaffInbox } from '@/lib/communications/access';
import { listConversationsForUser } from '@/lib/communications/conversations';
import { serializeConversation } from '@/lib/communications/serialize';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'communications', 'view');
  if (!auth.ok) return auth.error;
  if (!canAccessStaffInbox(auth.user)) return forbidden();

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  const result = await listConversationsForUser(auth.user.id, { page, pageSize });
  return paginated(
    result.items.map(serializeConversation),
    { page: result.page, pageSize: result.pageSize, totalItems: result.total }
  );
}
