import { db } from '@/lib/db';
import { promoteScheduledContent } from '@/lib/content/query';
import { isPubliclyVisible, publicStatusWhere } from '@/lib/content/status';
import { publicEventStatusWhere } from '@/lib/events/status';
import { publicGalleryWhere } from '@/lib/gallery/status';
import { listPublicFaqs } from './faqs';
import { listPublicTestimonials } from './testimonials';

export interface SearchResult {
  type: string;
  title: string;
  href: string;
  excerpt: string | null;
}

export async function searchPublicContent(q: string, options?: { page?: number; pageSize?: number }) {
  await promoteScheduledContent();
  const now = new Date();
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 12;
  const skip = (page - 1) * pageSize;
  const visibility = publicStatusWhere(now);

  const [pages, news, announcements, resources, sermons, events, albums, faqs, testimonials] =
    await Promise.all([
      db.cmsPage.findMany({
        where: { AND: [visibility, { OR: [{ title: { contains: q } }, { excerpt: { contains: q } }] }] },
        take: 8,
        select: { title: true, slug: true, excerpt: true },
      }),
      db.newsArticle.findMany({
        where: { AND: [visibility, { OR: [{ title: { contains: q } }, { excerpt: { contains: q } }] }] },
        take: 8,
        select: { title: true, slug: true, excerpt: true },
      }),
      db.announcement.findMany({
        where: {
          AND: [
            visibility,
            { startAt: { lte: now } },
            { OR: [{ endAt: null }, { endAt: { gt: now } }] },
            { OR: [{ title: { contains: q } }, { excerpt: { contains: q } }] },
          ],
        },
        take: 8,
        select: { title: true, slug: true, excerpt: true },
      }),
      db.resource.findMany({
        where: {
          AND: [visibility, { OR: [{ title: { contains: q } }, { description: { contains: q } }] }],
        },
        take: 8,
        select: { title: true, slug: true, description: true },
      }),
      db.sermon.findMany({
        where: {
          AND: [
            visibility,
            {
              OR: [
                { title: { contains: q } },
                { description: { contains: q } },
                { speakerName: { contains: q } },
              ],
            },
          ],
        },
        take: 8,
        select: { title: true, slug: true, description: true },
      }),
      db.event.findMany({
        where: {
          AND: [
            publicEventStatusWhere(now),
            {
              OR: [
                { title: { contains: q } },
                { description: { contains: q } },
                { shortDescription: { contains: q } },
                { organizerName: { contains: q } },
              ],
            },
          ],
        },
        take: 8,
        select: { title: true, slug: true, shortDescription: true },
      }),
      db.galleryAlbum.findMany({
        where: {
          AND: [
            publicGalleryWhere(now),
            {
              OR: [
                { title: { contains: q } },
                { description: { contains: q } },
                { category: { name: { contains: q } } },
              ],
            },
          ],
        },
        take: 8,
        select: { title: true, slug: true, description: true },
      }),
      db.cmsFaq.findMany({
        where: {
          AND: [visibility, { OR: [{ question: { contains: q } }, { answer: { contains: q } }] }],
        },
        take: 8,
        select: { id: true, question: true, answer: true, status: true, publishAt: true, publishedAt: true },
      }),
      db.cmsTestimonial.findMany({
        where: {
          AND: [
            visibility,
            { permissionGranted: true },
            { OR: [{ name: { contains: q } }, { content: { contains: q } }] },
          ],
        },
        take: 8,
        select: {
          id: true,
          name: true,
          content: true,
          status: true,
          publishedAt: true,
          permissionGranted: true,
        },
      }),
    ]);

  const visibleFaqs = faqs.filter((item) => isPubliclyVisible(item, now));
  const visibleTestimonials = testimonials.filter(
    (item) => item.permissionGranted && isPubliclyVisible(item, now)
  );

  const results: SearchResult[] = [
    ...pages.map((item) => ({
      type: 'page',
      title: item.title,
      href: `/pages/${item.slug}`,
      excerpt: item.excerpt,
    })),
    ...news.map((item) => ({
      type: 'news',
      title: item.title,
      href: `/news/${item.slug}`,
      excerpt: item.excerpt,
    })),
    ...announcements.map((item) => ({
      type: 'announcement',
      title: item.title,
      href: '/announcements',
      excerpt: item.excerpt,
    })),
    ...resources.map((item) => ({
      type: 'resource',
      title: item.title,
      href: '/resources',
      excerpt: item.description,
    })),
    ...sermons.map((item) => ({
      type: 'sermon',
      title: item.title,
      href: `/sermons/${item.slug}`,
      excerpt: item.description,
    })),
    ...events.map((item) => ({
      type: 'event',
      title: item.title,
      href: `/events/${item.slug}`,
      excerpt: item.shortDescription,
    })),
    ...albums.map((item) => ({
      type: 'gallery',
      title: item.title,
      href: `/gallery/${item.slug}`,
      excerpt: item.description,
    })),
    ...visibleFaqs.map((item) => ({
      type: 'faq',
      title: item.question,
      href: '/faq',
      excerpt: item.answer.slice(0, 160),
    })),
    ...visibleTestimonials.map((item) => ({
      type: 'testimonial',
      title: item.name,
      href: '/testimonials',
      excerpt: item.content.slice(0, 160),
    })),
  ];

  return {
    q,
    results: results.slice(skip, skip + pageSize),
    total: results.length,
  };
}

/** Lightweight helpers for public list pages (not search-scoped). */
export async function getPublicFaqBundle() {
  return listPublicFaqs();
}

export async function getPublicTestimonialBundle() {
  return listPublicTestimonials();
}
