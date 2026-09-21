import { success } from '@/lib/api/response';
import { listPublicTestimonials } from '@/lib/cms/testimonials';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const language = url.searchParams.get('language') || undefined;
  const testimonials = await listPublicTestimonials({ language });
  return success(testimonials);
}
