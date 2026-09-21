import { success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { getCmsReviewQueue } from '@/lib/cms/admin';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;

  const items = await getCmsReviewQueue();
  return success(
    items.map((item) => ({
      ...item,
      updatedAt: item.updatedAt.toISOString(),
    }))
  );
}
