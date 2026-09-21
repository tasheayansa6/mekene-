import { MetadataRoute } from 'next';
import { ministriesData } from '@/data/ministries';
import { getPublishedCmsUrls } from '@/lib/content/public';
import { getPublishedSermonUrls } from '@/lib/sermons/public';
import { getPublishedEventUrls } from '@/lib/events/public';
import { getPublishedGalleryUrls } from '@/lib/gallery/public';

const BASE_URL = 'https://busamekeneeyasus.org';

export async function generateSitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/about/leadership`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/ministries`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/library`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/library/playlists`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/podcast`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/sermons`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/bible-study`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/events`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/live`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${BASE_URL}/live/upcoming`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/services`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.75 },
    { url: `${BASE_URL}/events/past`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/news`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/announcements`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/resources`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
    { url: `${BASE_URL}/prayer`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/giving`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/give`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/give/now`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/give/campaigns`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/gallery`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/faqs`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/downloads`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/testimonials`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  const ministryPages: MetadataRoute.Sitemap = ministriesData.map((m) => ({
    url: `${BASE_URL}/ministries/${m.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const publishedSermons = await getPublishedSermonUrls();
  const sermonPages: MetadataRoute.Sitemap = [
    ...publishedSermons.sermons.map((item) => ({
      url: `${BASE_URL}/sermons/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...publishedSermons.series.map((item) => ({
      url: `${BASE_URL}/sermons/series/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];

  const publishedEvents = await getPublishedEventUrls();
  const eventPages: MetadataRoute.Sitemap = publishedEvents.map((item) => ({
    url: `${BASE_URL}/events/${item.slug}`,
    lastModified: item.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  const publishedAlbums = await getPublishedGalleryUrls();
  const galleryPages: MetadataRoute.Sitemap = publishedAlbums.map((item) => ({
    url: `${BASE_URL}/gallery/${item.slug}`,
    lastModified: item.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  const cms = await getPublishedCmsUrls();
  const cmsPages: MetadataRoute.Sitemap = [
    ...cms.pages.map((item) => ({
      url: `${BASE_URL}/pages/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    ...cms.news.map((item) => ({
      url: `${BASE_URL}/news/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...cms.resources.map((item) => ({
      url: `${BASE_URL}/resources`,
      lastModified: item.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];

  return [
    ...staticPages,
    ...ministryPages,
    ...sermonPages,
    ...eventPages,
    ...galleryPages,
    ...cmsPages,
  ];
}

/** Helper to create page metadata with consistent Open Graph and Twitter tags */
export function createPageMetadata({
  title,
  description,
  path,
  type = 'website',
  image,
}: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  image?: string;
}) {
  const url = `${BASE_URL}${path}`;
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : `${BASE_URL}${image}`
    : `${BASE_URL}/images/hero-church.jpg`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Busa Mekene Eyasus Church',
      type,
      locale: 'en_US',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}
