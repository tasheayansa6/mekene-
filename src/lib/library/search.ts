import { db } from '@/lib/db';
import { promoteScheduledContent } from '@/lib/content/query';
import { publicStatusWhere } from '@/lib/content/status';
import { speakerLabel } from '@/lib/sermons/serialize';

export type LibrarySearchResult = {
  kind: 'sermon' | 'resource' | 'playlist';
  id: string;
  title: string;
  slug: string;
  href: string;
  excerpt?: string | null;
  speakerName?: string | null;
  contentType?: string;
  publishedAt?: string | null;
};

export async function searchLibrary(
  q: string,
  filters?: {
    kind?: 'sermon' | 'resource' | 'playlist' | 'all';
    contentType?: string;
    page?: number;
    pageSize?: number;
  }
) {
  await promoteScheduledContent();
  const query = q.trim();
  const page = filters?.page || 1;
  const pageSize = Math.min(24, filters?.pageSize || 12);
  const kind = filters?.kind || 'all';
  const now = new Date();
  const visibility = publicStatusWhere(now);

  const results: LibrarySearchResult[] = [];

  if (kind === 'all' || kind === 'sermon') {
    const sermonWhere = {
      AND: [
        visibility,
        { accessLevel: 'public' as const },
        query
          ? {
              OR: [
                { title: { contains: query } },
                { description: { contains: query } },
                { transcript: { contains: query } },
                { speakerName: { contains: query } },
                { speaker: { OR: [{ firstName: { contains: query } }, { lastName: { contains: query } }] } },
                { scriptures: { some: { OR: [{ label: { contains: query } }, { book: { contains: query } }] } } },
              ],
            }
          : {},
        filters?.contentType ? { contentType: filters.contentType as never } : {},
      ],
    };

    const sermons = await db.sermon.findMany({
      where: sermonWhere,
      orderBy: { sermonDate: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: {
        speaker: { select: { firstName: true, lastName: true } },
      },
    });

    results.push(
      ...sermons.map((row) => ({
        kind: 'sermon' as const,
        id: row.id,
        title: row.title,
        slug: row.slug,
        href: `/sermons/${row.slug}`,
        excerpt: row.description,
        speakerName: speakerLabel(row),
        contentType: row.contentType,
        publishedAt: row.publishedAt?.toISOString() ?? null,
      }))
    );
  }

  if (kind === 'all' || kind === 'resource') {
    const resourceWhere = {
      AND: [
        visibility,
        { accessLevel: 'public' as const },
        query
          ? {
              OR: [{ title: { contains: query } }, { description: { contains: query } }],
            }
          : {},
      ],
    };

    const resources = await db.resource.findMany({
      where: resourceWhere,
      orderBy: { publishedAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        publishedAt: true,
      },
    });

    results.push(
      ...resources.map((row) => ({
        kind: 'resource' as const,
        id: row.id,
        title: row.title,
        slug: row.slug,
        href: `/library/resources/${row.slug}`,
        excerpt: row.description,
        publishedAt: row.publishedAt?.toISOString() ?? null,
      }))
    );
  }

  if (kind === 'all' || kind === 'playlist') {
    const playlists = await db.mediaPlaylist.findMany({
      where: {
        status: 'published',
        isPublic: true,
        ...(query
          ? {
              OR: [
                { title: { contains: query } },
                { description: { contains: query } },
              ],
            }
          : {}),
      },
      orderBy: { publishedAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        publishedAt: true,
      },
    });

    results.push(
      ...playlists.map((row) => ({
        kind: 'playlist' as const,
        id: row.id,
        title: row.title,
        slug: row.slug,
        href: `/library/playlists/${row.slug}`,
        excerpt: row.description,
        publishedAt: row.publishedAt?.toISOString() ?? null,
      }))
    );
  }

  return {
    q: query,
    page,
    pageSize,
    totalItems: results.length,
    results,
  };
}
