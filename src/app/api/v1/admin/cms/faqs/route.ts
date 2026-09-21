import { forbidden, notFound, paginated, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canPublishContent } from '@/lib/content/access';
import { createFaq, listAdminFaqs } from '@/lib/cms/faqs';
import { cmsListSchema, faqWriteSchema, formatZodErrors } from '@/lib/cms/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const parsed = cmsListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    category: url.searchParams.get('category') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, page, pageSize, status, category } = parsed.data;
  const result = await listAdminFaqs({ q, page, pageSize, status, category });
  return paginated(result.rows, { page, pageSize, totalItems: result.totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'content', 'create');
  if (!auth.ok) return auth.error;

  const parsed = faqWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (
    (parsed.data.status === 'published' || parsed.data.status === 'scheduled') &&
    !canPublishContent(auth.user)
  ) {
    return forbidden('You do not have permission to publish content.');
  }

  const faq = await createFaq({ ...parsed.data, authorId: auth.user.id });
  return success(faq, 'FAQ created.', 201);
}
