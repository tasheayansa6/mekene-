import { buildPodcastRssXml } from '@/lib/library/rss';

export async function GET() {
  const xml = await buildPodcastRssXml();
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
