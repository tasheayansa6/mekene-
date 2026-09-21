export function relatedSermonScore(
  current: { seriesId: string | null; speakerId: string | null; categoryId: string | null },
  other: { seriesId: string | null; speakerId: string | null; categoryId: string | null }
) {
  if (current.seriesId && other.seriesId === current.seriesId) return 0;
  if (current.speakerId && other.speakerId === current.speakerId) return 1;
  if (current.categoryId && other.categoryId === current.categoryId) return 2;
  return 3;
}

export function formatPlayerTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function sermonJsonLd(input: {
  title: string;
  description?: string | null;
  url: string;
  sermonDate: string;
  speakerName?: string | null;
  thumbnailUrl?: string | null;
  audioUrl?: string | null;
  videoWatchUrl?: string | null;
  videoEmbedUrl?: string | null;
}) {
  const media: Array<Record<string, unknown>> = [];
  if (input.videoWatchUrl) {
    media.push({
      '@type': 'VideoObject',
      name: input.title,
      url: input.videoWatchUrl,
      embedUrl: input.videoEmbedUrl || undefined,
      thumbnailUrl: input.thumbnailUrl || undefined,
      uploadDate: input.sermonDate,
    });
  }
  if (input.audioUrl) {
    media.push({
      '@type': 'AudioObject',
      name: input.title,
      contentUrl: input.audioUrl,
    });
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: input.title,
    description: input.description || undefined,
    url: input.url,
    dateCreated: input.sermonDate,
    creator: input.speakerName ? { '@type': 'Person', name: input.speakerName } : undefined,
    image: input.thumbnailUrl || undefined,
    associatedMedia: media.length ? media : undefined,
  };
}
