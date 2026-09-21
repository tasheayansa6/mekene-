import { success } from '@/lib/api/response';
import { listCourses } from '@/lib/education/courses';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const programId = url.searchParams.get('programId') || undefined;
  const page = Number(url.searchParams.get('page') || 1);
  const pageSize = Number(url.searchParams.get('pageSize') || 50);
  const result = await listCourses({
    publishedOnly: true,
    programId,
    page,
    pageSize,
  });
  return success({
    courses: result.items,
    page: result.page,
    pageSize: result.pageSize,
    totalItems: result.totalItems,
  });
}
