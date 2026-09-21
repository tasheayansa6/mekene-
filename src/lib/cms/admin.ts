import { db } from '@/lib/db';
import { promoteScheduledContent } from '@/lib/content/query';
import { listHomepageSections } from './homepage';

function totals(groups: Array<{ status: string; _count: { _all: number } }>) {
  const byStatus = Object.fromEntries(groups.map((row) => [row.status, row._count._all]));
  return {
    total: groups.reduce((sum, row) => sum + row._count._all, 0),
    draft: byStatus.draft || 0,
    review: byStatus.review || 0,
    scheduled: byStatus.scheduled || 0,
    published: byStatus.published || 0,
    archived: byStatus.archived || 0,
  };
}

export async function getCmsOverview() {
  await promoteScheduledContent();

  const [
    pages,
    news,
    announcements,
    resources,
    faqs,
    testimonials,
    reviewQueueCount,
    scheduledCount,
    homepageSections,
  ] = await Promise.all([
    db.cmsPage.groupBy({ by: ['status'], _count: { _all: true } }),
    db.newsArticle.groupBy({ by: ['status'], _count: { _all: true } }),
    db.announcement.groupBy({ by: ['status'], _count: { _all: true } }),
    db.resource.groupBy({ by: ['status'], _count: { _all: true } }),
    db.cmsFaq.groupBy({ by: ['status'], _count: { _all: true } }),
    db.cmsTestimonial.groupBy({ by: ['status'], _count: { _all: true } }),
    getReviewQueueCount(),
    getScheduledCount(),
    listHomepageSections(),
  ]);

  return {
    pages: totals(pages),
    news: totals(news),
    announcements: totals(announcements),
    resources: totals(resources),
    faqs: totals(faqs),
    testimonials: totals(testimonials),
    reviewQueue: reviewQueueCount,
    scheduled: scheduledCount,
    homepageSections: homepageSections.length,
  };
}

async function getReviewQueueCount() {
  const [pages, news, announcements, resources] = await Promise.all([
    db.cmsPage.count({ where: { status: 'review' } }),
    db.newsArticle.count({ where: { status: 'review' } }),
    db.announcement.count({ where: { status: 'review' } }),
    db.resource.count({ where: { status: 'review' } }),
  ]);
  return pages + news + announcements + resources;
}

async function getScheduledCount() {
  const [pages, news, announcements, resources, sermons, devotions] = await Promise.all([
    db.cmsPage.count({ where: { status: 'scheduled' } }),
    db.newsArticle.count({ where: { status: 'scheduled' } }),
    db.announcement.count({ where: { status: 'scheduled' } }),
    db.resource.count({ where: { status: 'scheduled' } }),
    db.sermon.count({ where: { status: 'scheduled', contentType: 'sermon' } }),
    db.sermon.count({ where: { status: 'scheduled', contentType: 'devotion' } }),
  ]);
  return pages + news + announcements + resources + sermons + devotions;
}

export async function getCmsReviewQueue() {
  const [pages, news, announcements, resources] = await Promise.all([
    db.cmsPage.findMany({
      where: { status: 'review' },
      select: { id: true, title: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    db.newsArticle.findMany({
      where: { status: 'review' },
      select: { id: true, title: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    db.announcement.findMany({
      where: { status: 'review' },
      select: { id: true, title: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    db.resource.findMany({
      where: { status: 'review' },
      select: { id: true, title: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
  ]);

  return [
    ...pages.map((item) => ({ type: 'page' as const, ...item })),
    ...news.map((item) => ({ type: 'news' as const, ...item })),
    ...announcements.map((item) => ({ type: 'announcement' as const, ...item })),
    ...resources.map((item) => ({ type: 'resource' as const, ...item })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function getCmsCalendar(from?: Date, to?: Date) {
  const start = from ?? new Date();
  const end = to ?? new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
  const scheduledWhere = {
    status: 'scheduled' as const,
    publishAt: { gte: start, lte: end },
  };

  const [pages, news, announcements, sermons, devotions] = await Promise.all([
    db.cmsPage.findMany({
      where: scheduledWhere,
      select: { id: true, title: true, slug: true, publishAt: true },
    }),
    db.newsArticle.findMany({
      where: scheduledWhere,
      select: { id: true, title: true, slug: true, publishAt: true },
    }),
    db.announcement.findMany({
      where: scheduledWhere,
      select: { id: true, title: true, slug: true, publishAt: true },
    }),
    db.sermon.findMany({
      where: { ...scheduledWhere, contentType: 'sermon' },
      select: { id: true, title: true, slug: true, publishAt: true },
    }),
    db.sermon.findMany({
      where: { ...scheduledWhere, contentType: 'devotion' },
      select: { id: true, title: true, slug: true, publishAt: true },
    }),
  ]);

  return [
    ...pages.map((item) => ({ type: 'page' as const, ...item })),
    ...news.map((item) => ({ type: 'news' as const, ...item })),
    ...announcements.map((item) => ({ type: 'announcement' as const, ...item })),
    ...sermons.map((item) => ({ type: 'sermon' as const, ...item })),
    ...devotions.map((item) => ({ type: 'devotion' as const, ...item })),
  ].sort((a, b) => (a.publishAt?.getTime() ?? 0) - (b.publishAt?.getTime() ?? 0));
}
