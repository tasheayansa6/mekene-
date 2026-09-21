import { paginated, success, validationError, notFound } from '@/lib/api/response';
import { requireAuth } from '@/lib/auth/authorize';
import { readJson, rejectIfCsrfInvalid } from '@/lib/auth/http';
import { isSavedKind, listSavedItems, saveItem } from '@/lib/member-portal/saved';
import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const result = await listSavedItems(auth.user.id, page, pageSize);
  return paginated(result.items, {
    page: result.page,
    pageSize: result.pageSize,
    totalItems: result.totalItems,
  });
}

const createSchema = z.object({
  kind: z.string().min(1),
  entityId: z.string().min(1),
});

export async function POST(request: Request) {
  const csrf = rejectIfCsrfInvalid(request);
  if (csrf) return csrf;
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  if (!isSavedKind(parsed.data.kind)) {
    return validationError({ kind: ['Unsupported saved item type.'] });
  }

  const result = await saveItem(auth.user.id, parsed.data.kind, parsed.data.entityId);
  if (!result.ok) return notFound('Item');
  return success(
    {
      saved: {
        id: result.item.id,
        kind: result.item.kind,
        entityId: result.item.entityId,
        title: result.target.title,
        href: result.target.href,
      },
    },
    'Saved.',
    201
  );
}
