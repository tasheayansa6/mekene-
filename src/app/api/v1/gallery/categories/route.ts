import { success } from '@/lib/api/response';
import { getPublicCategories } from '@/lib/gallery/public';

export async function GET() {
  return success(await getPublicCategories());
}
