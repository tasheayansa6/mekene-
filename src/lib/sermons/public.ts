import { db } from '@/lib/db';
import { promoteScheduledContent, seoDefaults } from '@/lib/content/query';
import { isPubliclyVisible, publicStatusWhere } from '@/lib/content/status';
import { sermonInclude, serializeSermon, speakerLabel } from './serialize';
import { relatedSermonScore } from './player';

export async function getPublicSermonList(options: {
  q?: string;
  speaker?: string;
  series?: string;
  category?: string;
  contentType?: string;
  mediaType?: 'audio' | 'video';
  featured?: boolean;
  from?: string;
  to?: string;
  sort?: 'newest' | 'oldest' | 'recent';
  page?: number;
  pageSize?: number;
  includeMembersContent?: boolean;
}) {
  await promoteScheduledContent();
  const now = new Date();
  const page = options.page || 1;
  const pageSize = options.pageSize || 12;
  const where: Record<string, unknown> = { AND: [publicStatusWhere(now)] };
  const and = where.AND as object[];
  and.push({
    accessLevel: options.includeMembersContent
      ? { in: ['public', 'members'] }
      : 'public',
  });
  const q = options.q?.trim();
  if (q) {
    and.push({
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { transcript: { contains: q } },
        { speakerName: { contains: q } },
        { speaker: { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }] } },
        { series: { name: { contains: q } } },
        { scriptures: { some: { OR: [{ label: { contains: q } }, { book: { contains: q } }] } } },
      ],
    });
  }
  if (options.contentType) {
    and.push({
      contentType: options.contentType as
        | 'sermon'
        | 'bible_study'
        | 'devotion'
        | 'teaching'
        | 'testimony'
        | 'conference'
        | 'special',
    });
  }
  if (options.mediaType === 'audio') and.push({ audioUrl: { not: null } });
  if (options.mediaType === 'video') and.push({ videoUrl: { not: null } });
  if (options.speaker) {
    and.push({
      OR: [
        { speakerId: options.speaker },
        { speaker: { id: options.speaker } },
        { speaker: { slug: options.speaker } },
      ],
    });
  }
  if (options.series) {
    and.push({ OR: [{ seriesId: options.series }, { series: { slug: options.series } }] });
  }
  if (options.category) {
    and.push({ OR: [{ categoryId: options.category }, { category: { slug: options.category } }] });
  }
  if (options.featured) and.push({ isFeatured: true });
  if (options.from) {
    const fromDate = new Date(options.from);
    if (!Number.isNaN(fromDate.getTime())) and.push({ sermonDate: { gte: fromDate } });
  }
  if (options.to) {
    const toDate = new Date(options.to);
    if (!Number.isNaN(toDate.getTime())) and.push({ sermonDate: { lte: toDate } });
  }

  const orderBy = options.sort === 'oldest' ? { sermonDate: 'asc' as const } : { sermonDate: 'desc' as const };

  const [totalItems, rows, featured, categories, series, speakers] = await Promise.all([
    db.sermon.count({ where }),
    db.sermon.findMany({
      where,
      include: sermonInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.sermon.findFirst({
      where: { AND: [publicStatusWhere(now), { isFeatured: true }, { accessLevel: 'public' }] },
      include: sermonInclude,
      orderBy: { sermonDate: 'desc' },
    }),
    db.sermonCategory.findMany({ orderBy: { sortOrder: 'asc' }, select: { name: true, slug: true } }),
    db.sermonSeries.findMany({
      where: publicStatusWhere(now),
      orderBy: { name: 'asc' },
      select: { name: true, slug: true },
    }),
    db.leader.findMany({
      where: { sermons: { some: publicStatusWhere(now) } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return {
    totalItems,
    page,
    pageSize,
    categories,
    series,
    speakers: speakers.map((person) => ({
      id: person.id,
      name: `${person.firstName} ${person.lastName}`.trim(),
    })),
    featured: featured && isPubliclyVisible(featured) ? serializeSermon(featured, { forPublic: true }) : null,
    sermons: rows.map((row) => serializeSermon(row, { forPublic: true })),
  };
}

export async function getPublicSermonBySlug(
  slug: string,
  options?: { includeMembersContent?: boolean }
) {
  await promoteScheduledContent();
  const sermon = await db.sermon.findUnique({ where: { slug }, include: sermonInclude });
  if (!sermon || !isPubliclyVisible(sermon)) return null;
  const access = (sermon as { accessLevel?: string }).accessLevel || 'public';
  if (access === 'restricted') return null;
  if (access === 'members' && !options?.includeMembersContent) return null;

  const relatedWhere = {
    AND: [
      publicStatusWhere(),
      { id: { not: sermon.id } },
      { accessLevel: 'public' as const },
      {
        OR: [
          sermon.seriesId ? { seriesId: sermon.seriesId } : null,
          sermon.speakerId ? { speakerId: sermon.speakerId } : null,
          sermon.categoryId ? { categoryId: sermon.categoryId } : null,
        ].filter(Boolean) as object[],
      },
    ],
  };
  const relatedRows =
    (relatedWhere.AND[2] as { OR: object[] }).OR.length === 0
      ? []
      : await db.sermon.findMany({
          where: relatedWhere,
          take: 12,
          orderBy: { sermonDate: 'desc' },
          include: {
            speaker: { select: { firstName: true, lastName: true } },
            series: { select: { name: true, slug: true } },
          },
        });

  const related = relatedRows
    .sort(
      (left, right) =>
        relatedSermonScore(sermon, left) - relatedSermonScore(sermon, right)
    )
    .slice(0, 3);

  return {
    sermon: serializeSermon(sermon, { forPublic: true }),
    related: related.map((item) => ({
      title: item.title,
      slug: item.slug,
      description: item.description,
      sermonDate: item.sermonDate.toISOString(),
      thumbnailUrl: item.thumbnailUrl,
      speakerName: speakerLabel(item),
      series: item.series,
    })),
    seo: seoDefaults({
      title: sermon.title,
      excerpt: sermon.description,
      seoTitle: sermon.seoTitle,
      seoDescription: sermon.seoDescription,
      featuredImageUrl: sermon.thumbnailUrl,
      ogImageUrl: sermon.ogImageUrl,
    }),
  };
}

export async function getPublicSeriesBySlug(slug: string) {
  await promoteScheduledContent();
  const series = await db.sermonSeries.findUnique({ where: { slug } });
  if (!series || !isPubliclyVisible(series)) return null;
  const sermons = await db.sermon.findMany({
    where: { AND: [publicStatusWhere(), { seriesId: series.id }] },
    include: sermonInclude,
    orderBy: { sermonDate: 'desc' },
  });
  return {
    series: {
      name: series.name,
      slug: series.slug,
      description: series.description,
      imageUrl: series.imageUrl,
      imageAlt: series.imageAlt,
    },
    sermons: sermons.map((row) => serializeSermon(row, { forPublic: true })),
    seo: seoDefaults({
      title: series.name,
      excerpt: series.description,
      seoTitle: series.seoTitle,
      seoDescription: series.seoDescription,
      featuredImageUrl: series.imageUrl,
    }),
  };
}

export async function getHomeSermon() {
  await promoteScheduledContent();
  const visibility = publicStatusWhere();
  const featured = await db.sermon.findFirst({
    where: { AND: [visibility, { isFeatured: true }, { accessLevel: 'public' }] },
    include: sermonInclude,
    orderBy: { sermonDate: 'desc' },
  });
  const latest = featured
    ? featured
    : await db.sermon.findFirst({
        where: { AND: [visibility, { accessLevel: 'public' }] },
        include: sermonInclude,
        orderBy: { sermonDate: 'desc' },
      });
  return latest ? serializeSermon(latest, { forPublic: true }) : null;
}

export async function getPublishedSermonUrls() {
  await promoteScheduledContent();
  const visibility = publicStatusWhere();
  const [sermons, series] = await Promise.all([
    db.sermon.findMany({
      where: { AND: [visibility, { accessLevel: 'public' }] },
      select: { slug: true, updatedAt: true },
    }),
    db.sermonSeries.findMany({ where: visibility, select: { slug: true, updatedAt: true } }),
  ]);
  return { sermons, series };
}

export async function listPublicSpeakers() {
  await promoteScheduledContent();
  const visibility = publicStatusWhere();

  const speakers = await db.leader.findMany({
    where: {
      isActive: true,
      status: 'published',
      sermons: { some: { AND: [visibility, { accessLevel: 'public' }] } },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      slug: true,
      title: true,
      photoUrl: true,
      bio: true,
    },
  });

  return speakers.map((person) => ({
    id: person.id,
    name: `${person.firstName} ${person.lastName}`.trim(),
    slug: person.slug || person.id,
    title: person.title,
    photoUrl: person.photoUrl,
    bio: person.bio,
    href: `/sermons/speakers/${person.slug || person.id}`,
  }));
}

export async function getPublicSpeakerBySlug(slug: string) {
  await promoteScheduledContent();
  const speaker = await db.leader.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
      isActive: true,
      status: 'published',
    },
  });
  if (!speaker) return null;

  const sermons = await db.sermon.findMany({
    where: {
      AND: [publicStatusWhere(), { speakerId: speaker.id }, { accessLevel: 'public' }],
    },
    include: sermonInclude,
    orderBy: { sermonDate: 'desc' },
    take: 50,
  });

  const name = `${speaker.firstName} ${speaker.lastName}`.trim();
  return {
    speaker: {
      id: speaker.id,
      name,
      slug: speaker.slug || speaker.id,
      title: speaker.title,
      bio: speaker.bio,
      photoUrl: speaker.photoUrl,
    },
    sermons: sermons.map((row) => serializeSermon(row, { forPublic: true })),
    seo: seoDefaults({
      title: name,
      excerpt: speaker.bio || `Sermons by ${name}`,
      featuredImageUrl: speaker.photoUrl,
    }),
  };
}

