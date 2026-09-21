import { forbidden, notFound, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { canPublishContent } from '@/lib/content/access';
import { getAdminTestimonial, updateTestimonial } from '@/lib/cms/testimonials';
import { formatZodErrors, testimonialWriteSchema } from '@/lib/cms/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await guardAdminRead(request, 'content', 'view');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;
  const testimonial = await getAdminTestimonial(id);
  if (!testimonial) return notFound('Testimonial');
  return success(testimonial);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await guardAdminWrite(request, 'content', 'update');
  if (!auth.ok) return auth.error;
  const { id } = await context.params;

  const parsed = testimonialWriteSchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  if (parsed.data.status === 'published' && !canPublishContent(auth.user)) {
    return forbidden('You do not have permission to publish content.');
  }

  try {
    const testimonial = await updateTestimonial(id, parsed.data);
    if (!testimonial) return notFound('Testimonial');
    return success(testimonial, 'Testimonial updated.');
  } catch {
    return validationError({ photoUrl: ['Images and links must use http(s) or an uploaded file path.'] });
  }
}
