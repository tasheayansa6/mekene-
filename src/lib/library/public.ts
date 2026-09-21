import { db } from '@/lib/db';
import { promoteScheduledContent } from '@/lib/content/query';
import { publicStatusWhere } from '@/lib/content/status';
import { getPublicSermonList } from '@/lib/sermons/public';
import { sermonInclude, serializeSermon } from '@/lib/sermons/serialize';
import { listPublicPlaylists } from './playlists';

export async function getLibraryHome() {
  await promoteScheduledContent();
  const now = new Date();
  const visibility = publicStatusWhere(now);
  const publicOnly = { accessLevel: 'public' as const };

  const [
    featuredRow,
    latestSermons,
    bibleStudies,
    devotionals,
    featuredPlaylists,
    popular,
    categories,
  ] = await Promise.all([
    db.sermon.findFirst({
      where: { AND: [visibility, publicOnly, { isFeatured: true }] },
      include: sermonInclude,
      orderBy: { sermonDate: 'desc' },
    }),
    db.sermon.findMany({
      where: { AND: [visibility, publicOnly, { contentType: 'sermon' }] },
      include: sermonInclude,
      orderBy: { sermonDate: 'desc' },
      take: 8,
    }),
    db.sermon.findMany({
      where: { AND: [visibility, publicOnly, { contentType: 'bible_study' }] },
      include: sermonInclude,
      orderBy: { sermonDate: 'desc' },
      take: 6,
    }),
    db.sermon.findMany({
      where: { AND: [visibility, publicOnly, { contentType: 'devotion' }] },
      include: sermonInclude,
      orderBy: { sermonDate: 'desc' },
      take: 6,
    }),
    listPublicPlaylists({ featured: true, pageSize: 6 }),
    db.sermon.findMany({
      where: { AND: [visibility, publicOnly] },
      include: sermonInclude,
      orderBy: { playCount: 'desc' },
      take: 8,
    }),
    db.sermonCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, description: true },
    }),
  ]);

  const featuredSermon =
    featuredRow != null ? serializeSermon(featuredRow, { forPublic: true }) : null;

  return {
    featuredSermon,
    latestSermons: latestSermons.map((row) => serializeSermon(row, { forPublic: true })),
    bibleStudies: bibleStudies.map((row) => serializeSermon(row, { forPublic: true })),
    devotionals: devotionals.map((row) => serializeSermon(row, { forPublic: true })),
    featuredPlaylists: featuredPlaylists.playlists,
    popular: popular.map((row) => serializeSermon(row, { forPublic: true })),
    categories,
  };
}

export async function getScriptureLibrary(book?: string) {
  await promoteScheduledContent();
  const now = new Date();
  const visibility = publicStatusWhere(now);

  const books = await db.sermonScripture.findMany({
    where: {
      sermon: { AND: [visibility, { accessLevel: 'public' }] },
    },
    distinct: ['book'],
    select: { book: true },
    orderBy: { book: 'asc' },
  });

  if (!book) {
    return {
      books: books.map((row) => row.book),
      sermons: [],
    };
  }

  const scriptureRows = await db.sermonScripture.findMany({
    where: {
      book: { equals: book },
      sermon: { AND: [visibility, { accessLevel: 'public' }] },
    },
    include: {
      sermon: { include: sermonInclude },
    },
    orderBy: [{ book: 'asc' }, { chapter: 'asc' }, { verseStart: 'asc' }],
  });

  const seen = new Set<string>();
  const sermons: Array<
    ReturnType<typeof serializeSermon> & { scriptureLabels: string[] }
  > = [];
  for (const row of scriptureRows) {
    if (seen.has(row.sermon.id)) continue;
    seen.add(row.sermon.id);
    sermons.push({
      ...serializeSermon(row.sermon, { forPublic: true }),
      scriptureLabels: scriptureRows
        .filter((item) => item.sermonId === row.sermon.id)
        .map((item) => item.label),
    });
  }

  return {
    books: books.map((row) => row.book),
    book,
    sermons,
  };
}

export { getPublicSermonList };
