import { success } from '@/lib/api/response';
import { getLibraryHome } from '@/lib/library/public';

export async function GET() {
  const data = await getLibraryHome();
  return success(data);
}
