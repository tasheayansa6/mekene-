/**
 * YouTube / external video provider architecture.
 * Official YouTube Data API may be wired later via server env only.
 * Do not scrape YouTube or put API keys in frontend code.
 */

import { parseApprovedVideo, type VideoEmbed } from './video';

export type YoutubeProviderConfig = {
  configured: boolean;
  apiKeyPresent: boolean;
};

export function getYoutubeProviderConfig(): YoutubeProviderConfig {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  return {
    configured: Boolean(apiKey),
    apiKeyPresent: Boolean(apiKey),
  };
}

/** Resolve an approved embed from a staff-supplied URL (no scraping). */
export function resolveExternalVideo(url: string | null | undefined): VideoEmbed | null {
  return parseApprovedVideo(url);
}

/**
 * Future: fetch metadata via official YouTube Data API when YOUTUBE_API_KEY is set.
 * Phase 18 stores references only — never downloads third-party video.
 */
export async function fetchYoutubeMetadataStub(videoId: string): Promise<{
  ok: false;
  reason: string;
  videoId: string;
}> {
  void videoId;
  const config = getYoutubeProviderConfig();
  if (!config.apiKeyPresent) {
    return {
      ok: false,
      reason: 'YOUTUBE_API_KEY not configured. Official API wiring is prepared for a later phase.',
      videoId,
    };
  }
  return {
    ok: false,
    reason: 'YouTube Data API client is prepared but not activated in Phase 18.',
    videoId,
  };
}
