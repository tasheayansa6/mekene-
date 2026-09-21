import { success } from '@/lib/api/response';
import { listPrograms } from '@/lib/education/programs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get('page') || 1);
  const pageSize = Number(url.searchParams.get('pageSize') || 50);
  const result = await listPrograms({ publishedOnly: true, page, pageSize });
  return success({
    programs: result.items,
    page: result.page,
    pageSize: result.pageSize,
    totalItems: result.totalItems,
  });
}
