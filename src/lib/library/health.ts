import { access } from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import { promoteScheduledContent } from '@/lib/content/query';
import { publicStatusWhere } from '@/lib/content/status';

function localUploadPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const relative = url.replace(/^\//, '').split('?')[0];
  if (!relative.startsWith('uploads/')) return null;
  return path.join(process.cwd(), 'public', relative);
}

async function fileMissing(url: string | null | undefined): Promise<boolean> {
  const filePath = localUploadPath(url);
  if (!filePath) return false;
  try {
    await access(filePath);
    return false;
  } catch {
    return true;
  }
}

export async function scanBrokenMedia() {
  await promoteScheduledContent();
  const visibility = publicStatusWhere();

  const [publishedSermons, failedJobs, emptyPlaylists] = await Promise.all([
    db.sermon.findMany({
      where: { AND: [visibility, { accessLevel: 'public' }] },
      select: {
        id: true,
        slug: true,
        title: true,
        audioUrl: true,
        videoUrl: true,
      },
    }),
    db.mediaProcessingJob.count({ where: { status: 'failed' } }),
    db.mediaPlaylist.count({
      where: {
        status: 'published',
        items: { none: {} },
      },
    }),
  ]);

  const brokenAudio: Array<{ id: string; slug: string; title: string }> = [];
  const brokenVideo: Array<{ id: string; slug: string; title: string }> = [];

  for (const sermon of publishedSermons) {
    if (sermon.audioUrl && (await fileMissing(sermon.audioUrl))) {
      brokenAudio.push({ id: sermon.id, slug: sermon.slug, title: sermon.title });
    }
    if (sermon.videoUrl && sermon.videoUrl.startsWith('/uploads/') && (await fileMissing(sermon.videoUrl))) {
      brokenVideo.push({ id: sermon.id, slug: sermon.slug, title: sermon.title });
    }
  }

  return {
    aggregates: {
      publishedChecked: publishedSermons.length,
      brokenAudioCount: brokenAudio.length,
      brokenVideoCount: brokenVideo.length,
      failedJobsCount: failedJobs,
      emptyPublishedPlaylistsCount: emptyPlaylists,
    },
    brokenAudio,
    brokenVideo,
  };
}
