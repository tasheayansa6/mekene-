import { success } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { db } from '@/lib/db';
import { getYoutubeProviderConfig } from '@/lib/sermons/youtube';

export async function GET(request: Request) {
  let auth = await guardAdminRead(request, 'media', 'view');
  if (!auth.ok) {
    auth = await guardAdminRead(request, 'sermons', 'view');
  }
  if (!auth.ok) return auth.error;

  const [
    publishedSermons,
    draftSermons,
    bibleStudies,
    seriesCount,
    audioCount,
    videoCount,
    resourceCount,
    bookmarkCount,
    pendingJobs,
  ] = await Promise.all([
    db.sermon.count({ where: { status: 'published' } }),
    db.sermon.count({ where: { status: 'draft' } }),
    db.sermon.count({ where: { contentType: 'bible_study' } }),
    db.sermonSeries.count(),
    db.sermon.count({ where: { audioUrl: { not: null } } }),
    db.sermon.count({ where: { videoUrl: { not: null } } }),
    db.resource.count({ where: { status: 'published' } }),
    db.sermonBookmark.count(),
    db.mediaProcessingJob.count({ where: { status: { in: ['pending', 'processing'] } } }),
  ]);

  return success({
    metrics: {
      publishedSermons,
      draftSermons,
      bibleStudies,
      seriesCount,
      audioCount,
      videoCount,
      resourceCount,
      bookmarkCount,
      pendingJobs,
    },
    youtube: getYoutubeProviderConfig(),
    sections: [
      { label: 'Sermons', href: '/admin/sermons' },
      { label: 'Bible studies', href: '/admin/sermons?contentType=bible_study' },
      { label: 'Series', href: '/admin/sermons/series' },
      { label: 'Categories', href: '/admin/sermons/categories' },
      { label: 'Resources', href: '/admin/content/resources' },
      { label: 'Analytics', href: '/admin/media/analytics' },
      { label: 'Health', href: '/admin/media/health' },
      { label: 'Playlists', href: '/admin/media/playlists' },
      { label: 'Jobs', href: '/admin/media/jobs' },
      { label: 'Reports', href: '/admin/media/reports' },
    ],
  });
}
