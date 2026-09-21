export const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

export const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

export interface VideoEmbed {
  provider: 'youtube' | 'vimeo';
  id: string;
  embedUrl: string;
  watchUrl: string;
}

function youtubeId(url: URL): string | null {
  if (url.hostname === 'youtu.be' || url.hostname === 'www.youtu.be') {
    return url.pathname.replace(/^\//, '').split('/')[0] || null;
  }
  if (url.pathname.startsWith('/embed/')) {
    return url.pathname.split('/')[2] || null;
  }
  if (url.pathname.startsWith('/shorts/')) {
    return url.pathname.split('/')[2] || null;
  }
  if (url.pathname.startsWith('/live/')) {
    return url.pathname.split('/')[2] || null;
  }
  return url.searchParams.get('v');
}

function vimeoId(url: URL): string | null {
  const parts = url.pathname.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  return last && /^\d+$/.test(last) ? last : null;
}

export function parseApprovedVideo(input?: string | null): VideoEmbed | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  const host = parsed.hostname.toLowerCase();
  if (YOUTUBE_HOSTS.has(host)) {
    const id = youtubeId(parsed);
    if (!id || !/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null;
    return {
      provider: 'youtube',
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
    };
  }
  if (VIMEO_HOSTS.has(host)) {
    const id = vimeoId(parsed);
    if (!id) return null;
    return {
      provider: 'vimeo',
      id,
      embedUrl: `https://player.vimeo.com/video/${id}`,
      watchUrl: `https://vimeo.com/${id}`,
    };
  }
  return null;
}

export function formatScriptureLabel(input: {
  book: string;
  chapter?: number | null;
  verseStart?: number | null;
  verseEnd?: number | null;
  label?: string | null;
}) {
  if (input.label?.trim()) return input.label.trim();
  const book = input.book.trim();
  if (!input.chapter) return book;
  if (!input.verseStart) return `${book} ${input.chapter}`;
  if (input.verseEnd && input.verseEnd !== input.verseStart) {
    return `${book} ${input.chapter}:${input.verseStart}-${input.verseEnd}`;
  }
  return `${book} ${input.chapter}:${input.verseStart}`;
}
