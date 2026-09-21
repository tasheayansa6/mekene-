import { db } from '@/lib/db';
import { getAppUrl } from '@/lib/auth/config';
import { promoteScheduledContent } from '@/lib/content/query';
import { publicStatusWhere } from '@/lib/content/status';
import { speakerLabel } from '@/lib/sermons/serialize';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absoluteUrl(base: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const normalized = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${normalized}`;
}

export async function buildPodcastRssXml(options?: {
  title?: string;
  description?: string;
  limit?: number;
}) {
  await promoteScheduledContent();
  const baseUrl = getAppUrl();
  const visibility = publicStatusWhere();
  const limit = options?.limit || 50;

  const sermons = await db.sermon.findMany({
    where: {
      AND: [
        visibility,
        { accessLevel: 'public' },
        { allowPodcast: true },
        { audioUrl: { not: null } },
      ],
    },
    orderBy: { sermonDate: 'desc' },
    take: limit,
    include: {
      speaker: { select: { firstName: true, lastName: true } },
    },
  });

  const channelTitle = options?.title || 'Church Sermon Podcast';
  const channelDescription =
    options?.description || 'Latest public sermon audio from our digital library.';

  const items = sermons
    .map((sermon) => {
      const pageUrl = `${baseUrl}/sermons/${sermon.slug}`;
      const audioUrl = absoluteUrl(baseUrl, sermon.audioUrl!);
      const pubDate = (sermon.publishedAt || sermon.sermonDate).toUTCString();
      const speaker = speakerLabel(sermon);

      return `    <item>
      <title>${escapeXml(sermon.title)}</title>
      <link>${escapeXml(pageUrl)}</link>
      <guid isPermaLink="true">${escapeXml(pageUrl)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      ${speaker ? `<itunes:author>${escapeXml(speaker)}</itunes:author>` : ''}
      ${sermon.description ? `<description>${escapeXml(sermon.description)}</description>` : ''}
      <enclosure url="${escapeXml(audioUrl)}" length="${sermon.audioSize || 0}" type="${escapeXml(sermon.audioMime || 'audio/mpeg')}" />
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(`${baseUrl}/library`)}</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>en-us</language>
    <lastBuildDate>${escapeXml(new Date().toUTCString())}</lastBuildDate>
${items}
  </channel>
</rss>`;
}

export function filterPodcastEligibleSermons<
  T extends { accessLevel: string; allowPodcast: boolean; audioUrl: string | null }
>(rows: T[]): T[] {
  return rows.filter(
    (row) => row.accessLevel === 'public' && row.allowPodcast === true && Boolean(row.audioUrl)
  );
}
