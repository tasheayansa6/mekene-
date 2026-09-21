import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canArchiveContent, canPublishContent } from '@/lib/content/access';
import { archiveFaq, getAdminFaq, updateFaq } from '@/lib/cms/faqs';
import { faqWriteSchema, formatZodErrors } from '@/lib/cms/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const faq = await getAdminFaq(id);
  if (!faq) return notFound('FAQ');
  return success(faq);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;

  const parsed = faqWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (
    (parsed.data.status === 'published' || parsed.data.status === 'scheduled') &&
    !canPublishContent(auth.user)
  ) {
    return forbidden('You do not have permission to publish content.');
  }

  const faq = await updateFaq(id, parsed.data);
  if (!faq) return notFound('FAQ');
  return success(faq, 'FAQ updated.');
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'archive');
  if (!auth.ok) return auth.error;
  if (!canArchiveContent(auth.user)) return forbidden();

  const { id } = await context.params;
  const existing = await getAdminFaq(id);
  if (!existing) return notFound('FAQ');

  const faq = await archiveFaq(id);
  return success(faq, 'FAQ archived.');
}
