import { notFound, success } from '@/lib/api/response';
import { getCourseBySlug } from '@/lib/education/courses';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const course = await getCourseBySlug(slug, {
    publishedOnly: true,
    includeModules: true,
    publishedLessonsOnly: true,
  });
  if (!course) return notFound('Course not found');
  return success(course);
}
