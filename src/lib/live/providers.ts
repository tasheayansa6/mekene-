import { parseApprovedVideo } from '@/lib/sermons/video';
import type { LiveStreamProvider as LiveStreamProviderEnum } from '@prisma/client';

export type LiveStreamProviderName = LiveStreamProviderEnum;

export interface LiveStreamProvider {
  name: LiveStreamProviderName;
  resolve(streamUrl: string): StreamResolveResult;
}

export type StreamResolveResult =
  | { ok: true; embedUrl: string; providerVideoId: string | null }
  | { ok: false; error: string };

const EXTERNAL_EMBED_HOSTS = new Set([
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtube.com',
  'www.youtube.com',
  'player.vimeo.com',
  'facebook.com',
  'www.facebook.com',
  'fb.watch',
  'www.fb.watch',
]);

const FACEBOOK_VIDEO_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'fb.watch',
  'www.fb.watch',
  'm.facebook.com',
]);

const BLOCKED_PROTOCOLS = /^(javascript|data|vbscript):/i;

export function sanitizeEmbedUrl(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed || BLOCKED_PROTOCOLS.test(trimmed)) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (BLOCKED_PROTOCOLS.test(parsed.protocol)) return null;
  const host = parsed.hostname.toLowerCase();
  if (!EXTERNAL_EMBED_HOSTS.has(host)) return null;
  return parsed.toString();
}

function parseFacebookVideoUrl(input: string): StreamResolveResult {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return { ok: false, error: 'Invalid Facebook video URL.' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'Facebook video URL must use http or https.' };
  }
  const host = parsed.hostname.toLowerCase();
  if (!FACEBOOK_VIDEO_HOSTS.has(host)) {
    return { ok: false, error: 'Only public Facebook video URLs are supported.' };
  }
  const publicUrl = parsed.toString();
  const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(publicUrl)}`;
  return { ok: true, embedUrl, providerVideoId: null };
}

const youtubeProvider: LiveStreamProvider = {
  name: 'youtube',
  resolve(streamUrl) {
    const parsed = parseApprovedVideo(streamUrl);
    if (!parsed || parsed.provider !== 'youtube') {
      return { ok: false, error: 'Provide a valid YouTube live or video URL.' };
    }
    const embedUrl = `${parsed.embedUrl}?autoplay=1`;
    return { ok: true, embedUrl, providerVideoId: parsed.id };
  },
};

const facebookProvider: LiveStreamProvider = {
  name: 'facebook',
  resolve(streamUrl) {
    return parseFacebookVideoUrl(streamUrl);
  },
};

const externalProvider: LiveStreamProvider = {
  name: 'external',
  resolve(streamUrl) {
    const embedUrl = sanitizeEmbedUrl(streamUrl);
    if (!embedUrl) {
      return {
        ok: false,
        error:
          'External embed URL must be https from an approved host (YouTube, Vimeo, or Facebook).',
      };
    }
    let providerVideoId: string | null = null;
    const youtube = parseApprovedVideo(embedUrl);
    if (youtube) providerVideoId = youtube.id;
    return { ok: true, embedUrl, providerVideoId };
  },
};

const PROVIDERS: Record<LiveStreamProviderName, LiveStreamProvider> = {
  youtube: youtubeProvider,
  facebook: facebookProvider,
  external: externalProvider,
};

export function resolveStreamConfig(input: {
  provider: LiveStreamProviderName;
  streamUrl?: string | null;
}): StreamResolveResult {
  if (!input.streamUrl?.trim()) {
    return { ok: false, error: 'Stream URL is required.' };
  }
  const provider = PROVIDERS[input.provider];
  if (!provider) {
    return { ok: false, error: 'Unsupported live stream provider.' };
  }
  return provider.resolve(input.streamUrl.trim());
}

export function isAllowedFacebookVideoUrl(url: string): boolean {
  return parseFacebookVideoUrl(url).ok;
}
