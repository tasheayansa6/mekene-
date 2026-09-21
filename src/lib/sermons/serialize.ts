import { authorSelect, serializeAuthor, seoDefaults } from '@/lib/content/query';
import { parseApprovedVideo } from './video';

export const sermonInclude = {
  author: { select: authorSelect },
  speaker: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      title: true,
      slug: true,
      bio: true,
      photoUrl: true,
    },
  },
  series: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  scriptures: { orderBy: { sortOrder: 'asc' as const } },
} as const;

export function speakerLabel(input: {
  speakerName: string | null;
  speaker: { firstName: string; lastName: string; title: string | null } | null;
}) {
  if (input.speaker) {
    return `${input.speaker.firstName} ${input.speaker.lastName}`.trim();
  }
  return input.speakerName?.trim() || null;
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function serializeSermon(
  row: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    notes: string | null;
    transcript: string | null;
    transcriptStatus?: string;
    contentType?: string;
    accessLevel?: string;
    allowDownload?: boolean;
    allowPodcast?: boolean;
    playCount?: number;
    viewCount?: number;
    speakerName: string | null;
    speakerId: string | null;
    seriesId: string | null;
    categoryId: string | null;
    sermonDate: Date;
    durationSeconds?: number | null;
    thumbnailUrl: string | null;
    thumbnailAlt: string | null;
    audioUrl: string | null;
    audioFileName: string | null;
    audioMime: string | null;
    audioSize: number | null;
    videoUrl: string | null;
    notesFileUrl: string | null;
    notesFileName: string | null;
    notesFileMime: string | null;
    notesFileSize: number | null;
    copyrightHolder?: string | null;
    license?: string | null;
    sourceAttribution?: string | null;
    status: string;
    isFeatured: boolean;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImageUrl: string | null;
    publishedAt: Date | null;
    publishAt: Date | null;
    audioDownloads: number;
    notesDownloads: number;
    createdAt: Date;
    updatedAt: Date;
    author: { id: string; firstName: string; lastName: string };
    speaker: {
      id: string;
      firstName: string;
      lastName: string;
      title: string | null;
      slug?: string | null;
    } | null;
    series: { id: string; name: string; slug: string } | null;
    category: { id: string; name: string; slug: string } | null;
    scriptures: Array<{
      id: string;
      book: string;
      chapter: number | null;
      verseStart: number | null;
      verseEnd: number | null;
      label: string;
      sortOrder: number;
    }>;
  },
  options?: { includePrivateMedia?: boolean; forPublic?: boolean }
) {
  const seo = seoDefaults({
    title: row.title,
    excerpt: row.description,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    featuredImageUrl: row.thumbnailUrl,
    ogImageUrl: row.ogImageUrl,
  });
  const video = parseApprovedVideo(row.videoUrl);
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    notes: row.notes,
    transcript:
      options?.forPublic && (row.transcriptStatus ?? 'draft') !== 'published'
        ? null
        : row.transcript,
    transcriptStatus: row.transcriptStatus ?? 'draft',
    contentType: row.contentType || 'sermon',
    accessLevel: row.accessLevel || 'public',
    speakerName: speakerLabel(row),
    speakerId: row.speakerId,
    speaker: row.speaker
      ? {
          id: row.speaker.id,
          name: `${row.speaker.firstName} ${row.speaker.lastName}`.trim(),
          title: row.speaker.title,
          slug: row.speaker.slug || null,
        }
      : null,
    seriesId: row.seriesId,
    series: row.series,
    categoryId: row.categoryId,
    category: row.category,
    sermonDate: row.sermonDate.toISOString(),
    durationSeconds: row.durationSeconds ?? null,
    thumbnailUrl: row.thumbnailUrl,
    thumbnailAlt: row.thumbnailAlt,
    hasAudio: Boolean(row.audioUrl),
    audioUrl: options?.includePrivateMedia === false ? null : row.audioUrl,
    audioFileName: row.audioFileName,
    allowDownload: row.allowDownload !== false,
    allowPodcast: row.allowPodcast !== false,
    playCount: row.playCount ?? 0,
    viewCount: row.viewCount ?? 0,
    audioDownloadUrl:
      row.audioUrl && row.allowDownload !== false
        ? `/api/v1/sermons/${row.slug}/download?kind=audio`
        : null,
    videoUrl: row.videoUrl,
    video: video
      ? { provider: video.provider, embedUrl: video.embedUrl, watchUrl: video.watchUrl }
      : null,
    notesFileUrl: row.notesFileUrl,
    notesFileName: row.notesFileName,
    hasNotesFile: Boolean(row.notesFileUrl),
    notesDownloadUrl: row.notesFileUrl
      ? `/api/v1/sermons/${row.slug}/download?kind=notes`
      : null,
    copyrightHolder: row.copyrightHolder ?? null,
    license: row.license ?? null,
    sourceAttribution: row.sourceAttribution ?? null,
    status: row.status,
    isFeatured: row.isFeatured,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    ogImageUrl: row.ogImageUrl,
    publishedAt: iso(row.publishedAt),
    publishAt: iso(row.publishAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: serializeAuthor(row.author),
    scriptures: row.scriptures,
    seo,
  };
}
