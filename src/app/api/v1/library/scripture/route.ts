import { success } from '@/lib/api/response';
import { getScriptureLibrary } from '@/lib/library/public';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const book = url.searchParams.get('book') || undefined;
  const data = await getScriptureLibrary(book);
  return success(data);
}
