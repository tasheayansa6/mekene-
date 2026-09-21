import { success } from '@/lib/api/response';
import { listPublicFaqs } from '@/lib/cms/faqs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category') || undefined;
  const language = url.searchParams.get('language') || undefined;
  const faqs = await listPublicFaqs({ category, language });
  return success(faqs);
}
