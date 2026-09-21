import { db } from '@/lib/db';
import { promoteScheduledContent } from '@/lib/content/query';
import { publicStatusWhere } from '@/lib/content/status';
import { speakerLabel } from '@/lib/sermons/serialize';

export async function aggregatePopular(periodDays = 30) {
  await promoteScheduledContent();
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const visibility = publicStatusWhere();

  const sermons = await db.sermon.findMany({
    where: {
      AND: [visibility, { accessLevel: 'public' }, { updatedAt: { gte: since } }],
    },
    orderBy: { playCount: 'desc' },
    take: 10,
    include: {
      speaker: { select: { firstName: true, lastName: true } },
    },
  });

  return {
    periodDays,
    popular: sermons.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      playCount: row.playCount,
      viewCount: row.viewCount,
      speakerName: speakerLabel(row),
      href: `/sermons/${row.slug}`,
    })),
  };
}

export async function getAdminMediaAnalytics() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalPlays,
    totalViews,
    totalAudioDownloads,
    totalNotesDownloads,
    popularSpeakers,
    recentPlays,
  ] = await Promise.all([
    db.sermon.aggregate({ _sum: { playCount: true } }),
    db.sermon.aggregate({ _sum: { viewCount: true } }),
    db.sermon.aggregate({ _sum: { audioDownloads: true } }),
    db.sermon.aggregate({ _sum: { notesDownloads: true } }),
    db.sermon.groupBy({
      by: ['speakerName'],
      where: {
        status: 'published',
        speakerName: { not: null },
      },
      _sum: { playCount: true },
      orderBy: { _sum: { playCount: 'desc' } },
      take: 10,
    }),
    db.sermon.aggregate({
      _sum: { playCount: true },
      where: { updatedAt: { gte: since30 } },
    }),
  ]);

  return {
    totals: {
      plays: totalPlays._sum.playCount || 0,
      views: totalViews._sum.viewCount || 0,
      audioDownloads: totalAudioDownloads._sum.audioDownloads || 0,
      notesDownloads: totalNotesDownloads._sum.notesDownloads || 0,
      recentPlays: recentPlays._sum.playCount || 0,
    },
    popularSpeakers: popularSpeakers.map((row) => ({
      speakerName: row.speakerName,
      playCount: row._sum.playCount || 0,
    })),
  };
}

export async function incrementSermonPlayCount(slug: string) {
  await promoteScheduledContent();
  const sermon = await db.sermon.findUnique({ where: { slug } });
  if (!sermon || sermon.status !== 'published' || sermon.accessLevel !== 'public') return null;

  const updated = await db.sermon.update({
    where: { id: sermon.id },
    data: { playCount: { increment: 1 } },
    select: { playCount: true },
  });

  return { playCount: updated.playCount };
}

export async function incrementSermonViewCount(slug: string) {
  await promoteScheduledContent();
  const sermon = await db.sermon.findUnique({ where: { slug } });
  if (!sermon || sermon.status !== 'published' || sermon.accessLevel !== 'public') return null;

  const updated = await db.sermon.update({
    where: { id: sermon.id },
    data: { viewCount: { increment: 1 } },
    select: { viewCount: true },
  });

  return { viewCount: updated.viewCount };
}
