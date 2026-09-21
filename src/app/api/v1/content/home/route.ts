import { success } from '@/lib/api/response';
import { getHomeCmsContent } from '@/lib/content/public';

export async function GET() {
  const data = await getHomeCmsContent();
  return success({
    featuredNews: data.featuredNews,
    latestNews: data.latestNews,
    announcements: data.announcements,
    featuredResources: data.featuredResources,
    homepageSections: data.homepageSections,
  });
}
