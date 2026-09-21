import { forbidden, paginated, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canPublishContent } from '@/lib/content/access';
import { createTestimonial, listAdminTestimonials } from '@/lib/cms/testimonials';
import { cmsListSchema, formatZodErrors, testimonialWriteSchema } from '@/lib/cms/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;

  const url = new URL(request.url);
  const parsed = cmsListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const { q, page, pageSize, status } = parsed.data;
  const result = await listAdminTestimonials({ q, page, pageSize, status });
  return paginated(result.rows, { page, pageSize, totalItems: result.totalItems });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'content', 'create');
  if (!auth.ok) return auth.error;

  const parsed = testimonialWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (parsed.data.status === 'published' && !canPublishContent(auth.user)) {
    return forbidden('You do not have permission to publish content.');
  }

  try {
    const testimonial = await createTestimonial({ ...parsed.data, authorId: auth.user.id });
    return success(testimonial, 'Testimonial created.', 201);
  } catch {
    return validationError({ photoUrl: ['Images and links must use http(s) or an uploaded file path.'] });
  }
}
